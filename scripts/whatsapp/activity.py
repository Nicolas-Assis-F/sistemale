"""Lê a bridge local do WhatsApp (somente leitura) e grava a atividade por telefone.

Uso: python3 scripts/whatsapp/activity.py [pasta_store] > data/crm/activity.json

A bridge mantém o banco travado enquanto roda, então o script faz uma cópia
consistente (backup do SQLite) numa pasta temporária antes de ler. Nada é
enviado nem alterado no WhatsApp.
"""
import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime

STORE = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/whatsapp-mcp/whatsapp-bridge/store')
MEDIA = {'audio': '[áudio]', 'image': '[foto]', 'video': '[vídeo]', 'document': '[documento]', 'sticker': '[figurinha]'}


def snapshot(name, tmp):
    src = sqlite3.connect(f'file:{os.path.join(STORE, name)}?mode=ro', uri=True)
    dst = sqlite3.connect(os.path.join(tmp, name))
    src.backup(dst)
    src.close()
    return dst


def iso(ts):
    return datetime.fromisoformat(ts).isoformat() if ts else None


def main():
    with tempfile.TemporaryDirectory() as tmp:
        msgs = snapshot('messages.db', tmp)
        wa = snapshot('whatsapp.db', tmp)
        lid_to_pn = dict(wa.execute('select lid, pn from whatsmeow_lid_map'))
        names = {}
        for jid, full, push in wa.execute('select their_jid, full_name, push_name from whatsmeow_contacts'):
            names[jid.split('@')[0]] = (full or None, push or None)

        def phone_of(jid):
            user, _, server = jid.partition('@')
            if server == 's.whatsapp.net':
                return user
            if server == 'lid':
                return lid_to_pn.get(user)
            return None

        out = {}
        rows = msgs.execute("""
            select chat_jid,
                   max(case when is_from_me = 0 then timestamp end),
                   max(case when is_from_me = 1 then timestamp end)
            from messages
            where chat_jid like '%@lid' or chat_jid like '%@s.whatsapp.net'
            group by chat_jid
        """).fetchall()
        for jid, last_in, last_out in rows:
            phone = phone_of(jid)
            if not phone:
                continue
            last = msgs.execute(
                'select timestamp, is_from_me, content, media_type from messages where chat_jid = ? order by timestamp desc limit 1',
                (jid,)).fetchone()
            prev = out.get(phone)
            entry = {
                'phone': phone,
                'savedName': (names.get(phone) or (None, None))[0],
                'pushName': (names.get(phone) or (None, None))[1] or (names.get(jid.split('@')[0]) or (None, None))[1],
                'lastInboundAt': iso(last_in),
                'lastOutboundAt': iso(last_out),
                'lastMessageAt': iso(last[0]) if last else None,
                'lastMessage': ((('Você: ' if last[1] else '') + ((last[2] or '').strip() or MEDIA.get(last[3] or '', '[mídia]')))[:200]) if last else None,
            }
            if prev:  # mesmo telefone em @lid e @s.whatsapp.net: fica o mais recente de cada campo
                for k in ('lastInboundAt', 'lastOutboundAt'):
                    entry[k] = max(filter(None, [prev[k], entry[k]]), default=None)
                if (prev['lastMessageAt'] or '') > (entry['lastMessageAt'] or ''):
                    entry['lastMessageAt'], entry['lastMessage'] = prev['lastMessageAt'], prev['lastMessage']
            out[phone] = entry
        json.dump({'generatedAt': datetime.now().astimezone().isoformat(), 'chats': list(out.values())},
                  sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
