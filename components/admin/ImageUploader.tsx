'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, ImagePlus, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
}

interface SortableImageProps {
  url: string;
  onRemove: () => void;
}

function SortableImage({ url, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-border bg-muted shrink-0 shadow-sm"
    >
      <Image src={url} alt="Foto do produto" fill className="object-cover" sizes="96px" />
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity rounded-xl">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-white p-1.5 rounded-lg hover:bg-white/20 cursor-grab active:cursor-grabbing"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-white p-1.5 rounded-lg hover:bg-red-500/70"
          title="Remover imagem"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Badge "principal" na primeira imagem */}
    </div>
  );
}

export function ImageUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const onDrop = useCallback(
    async (files: File[]) => {
      setError('');
      setSuccess(false);
      setUploading(true);
      setUploadCount(0);
      setTotalCount(files.length);
      const newUrls: string[] = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          newUrls.push(data.url);
          setUploadCount((n) => n + 1);
        } else {
          setError(data.error ?? 'Erro ao fazer upload.');
        }
      }

      onChange([...value, ...newUrls]);
      setUploading(false);
      if (newUrls.length > 0) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    },
    [value, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(String(active.id));
      const newIndex = value.indexOf(String(over.id));
      onChange(arrayMove(value, oldIndex, newIndex));
    }
  }

  function removeImage(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        } ${uploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Enviando {uploadCount}/{totalCount} imagem{totalCount !== 1 ? 's' : ''}…
              </p>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600">Upload concluído!</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ImagePlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragActive ? 'Solte as imagens aqui' : 'Arraste imagens ou clique para selecionar'}
                </p>
                <p className="text-xs mt-1">JPG, PNG ou WebP — máximo 5MB por imagem</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
          {error}
        </p>
      )}

      {/* Previews reordenáveis */}
      {value.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {value.length} imagem{value.length !== 1 ? 's' : ''} · arraste para reordenar · a primeira é a principal
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={value} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 flex-wrap">
                {value.map((url, i) => (
                  <div key={url} className="relative">
                    <SortableImage url={url} onRemove={() => removeImage(url)} />
                    {i === 0 && (
                      <span className="absolute -top-1.5 -left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        PRINCIPAL
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
