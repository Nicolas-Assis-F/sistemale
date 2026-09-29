import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Tipo real pelo conteúdo (o `type` enviado pelo navegador pode ser falsificado). */
function sniffImage(head: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  const ascii = (a: number, b: number) => String.fromCharCode(...head.slice(a, b));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB.' }, { status: 400 });
  }

  const realType = sniffImage(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!realType) {
    return NextResponse.json({ error: 'O arquivo não é uma imagem JPG, PNG ou WebP válida.' }, { status: 400 });
  }

  // Persistência local no servidor próprio: monte data/uploads como volume no deploy.
  if (process.env.UPLOAD_STORAGE === 'local' || (process.env.NODE_ENV === 'development' && process.env.UPLOAD_STORAGE !== 'blob')) {
    return saveLocally(file, realType);
  }

  return saveToVercelBlob(file, realType);
}

async function saveLocally(file: File, type: keyof typeof EXT): Promise<NextResponse> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');
  const { randomUUID } = await import('crypto');

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = EXT[type];
  const filename = `${randomUUID()}.${extension}`;
  const dir = join(process.cwd(), 'data', 'uploads');
  await mkdir(dir, { recursive: true });
  const filepath = join(dir, filename);

  await writeFile(filepath, buffer);

  const url = `/media/${filename}`;
  return NextResponse.json({ url });
}

async function saveToVercelBlob(file: File, type: keyof typeof EXT): Promise<NextResponse> {
  try {
    const { put } = await import('@vercel/blob');
    const { randomUUID } = await import('crypto');
    // Nome gerado aqui: o nome original do arquivo nunca entra no caminho público
    const blob = await put(`produtos/${Date.now()}-${randomUUID().slice(0, 8)}.${EXT[type]}`, file, {
      access: 'public',
      contentType: type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('private store') || message.includes('private access')) {
      return NextResponse.json(
        { error: 'A store do Vercel Blob está configurada como privada. Crie uma nova store com acesso "Public".' },
        { status: 500 }
      );
    }
    if (message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Store do Vercel Blob não encontrada. Verifique o BLOB_READ_WRITE_TOKEN no painel Vercel → Storage.' },
        { status: 500 }
      );
    }

    console.error('[upload] falha no Vercel Blob:', message);
    return NextResponse.json({ error: 'Erro ao fazer upload. Tente novamente.' }, { status: 500 });
  }
}
