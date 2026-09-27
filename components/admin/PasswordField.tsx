'use client';

import { useId, useState, type KeyboardEvent, type ComponentProps } from 'react';
import { Eye, EyeOff, LockKeyhole, ArrowBigUpDash } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<'input'>, 'type'> & {
  label?: string;
  error?: string;
  /** Visual para fundos escuros (login) ou claros (formulários do painel). */
  tone?: 'dark' | 'light';
};

/**
 * Campo de senha com alternância ver/ocultar, aviso de Caps Lock, estado de
 * foco com halo e estilos de autofill neutralizados (o Chrome pinta o input
 * de azul-claro e, sobre fundo escuro, o texto branco sumia).
 */
export function PasswordField({ label = 'Senha', error, tone = 'dark', className, id, onKeyUp, onKeyDown, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const syncCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  const dark = tone === 'dark';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className={cn('text-xs font-medium tracking-wide', dark ? 'text-white/70' : 'text-foreground')}>
          {label}
        </label>
        <span
          id={hintId}
          aria-live="polite"
          className={cn(
            'flex items-center gap-1 text-[11px] font-medium transition-opacity duration-200',
            capsLock ? 'opacity-100' : 'opacity-0',
            dark ? 'text-le-yellow' : 'text-amber-600',
          )}
        >
          {capsLock && (
            <>
              <ArrowBigUpDash className="h-3.5 w-3.5" /> Caps Lock ativado
            </>
          )}
        </span>
      </div>

      <div
        data-invalid={error ? '' : undefined}
        className={cn(
          'group/field relative flex h-12 items-center rounded-xl border transition-[border-color,box-shadow,background-color] duration-200',
          dark
            ? 'border-white/12 bg-white/[0.045] hover:border-white/20 focus-within:border-le-blue-light focus-within:bg-white/[0.07] focus-within:shadow-[0_0_0_4px_rgb(49_88_239/0.28)]'
            : 'border-input bg-white hover:border-le-blue-border focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgb(49_88_239/0.14)]',
          'data-invalid:border-red-400/70 data-invalid:shadow-[0_0_0_4px_rgb(248_113_113/0.16)]',
        )}
      >
        <LockKeyhole
          aria-hidden
          className={cn(
            'pointer-events-none ml-4 h-4 w-4 shrink-0 transition-colors',
            dark ? 'text-white/70 group-focus-within/field:text-le-blue-light' : 'text-muted-foreground group-focus-within/field:text-primary',
          )}
        />
        <input
          {...props}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => { syncCaps(e); onKeyDown?.(e); }}
          onKeyUp={(e) => { syncCaps(e); onKeyUp?.(e); }}
          onBlur={(e) => { setCapsLock(false); props.onBlur?.(e); }}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] tracking-wide outline-none disabled:cursor-not-allowed disabled:opacity-60',
            !visible && 'font-mono tracking-[0.2em] placeholder:tracking-[0.2em]',
            dark
              ? 'text-white caret-le-blue-light placeholder:text-white/70 autofill:shadow-[inset_0_0_0_1000px_#15144a] autofill:[-webkit-text-fill-color:#fff]'
              : 'text-foreground placeholder:text-muted-foreground/60 autofill:shadow-[inset_0_0_0_1000px_#fff]',
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          aria-controls={inputId}
          className={cn(
            'mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2',
            dark
              ? 'text-white/70 hover:bg-white/8 hover:text-white focus-visible:ring-le-blue-light'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary',
          )}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
