'use client';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import type { AiModel, ChatMessage } from '@/lib/types';
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Star,
  Trash,
  Expand,
  Shrink,
  Minus,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownLite from './MarkdownLite';
import { CopyToClipboard } from '../ui/CopyToClipboard';
import { estimateTokens, sanitizeContent } from '@/lib/utils';
import ModelSelector from '../selectors/ModelSelector';

export type ChatGridProps = {
  selectedModels: AiModel[];
  headerTemplate: string;
  collapsedIds: string[];
  setCollapsedIds: (updater: (prev: string[]) => string[]) => void;
  loadingIds: string[];
  pairs: { user: ChatMessage; answers: ChatMessage[] }[];
  onEditUser: (turnIndex: number, newText: string) => void;
  onDeleteUser: (turnIndex: number) => void;
  onDeleteAnswer: (turnIndex: number, modelId: string) => void;
  onToggle: (id: string) => void;
};

export default function ChatGrid({
  selectedModels,
  headerTemplate,
  collapsedIds,
  setCollapsedIds,
  loadingIds,
  pairs,
  onEditUser,
  onDeleteUser,
  onDeleteAnswer,
  onToggle,
}: ChatGridProps) {
  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'turn'; turnIndex: number }
    | { type: 'answer'; turnIndex: number; modelId: string }
    | null
  >(null);
  const headerCols = useMemo(
    () => headerTemplate || `repeat(${selectedModels.length}, minmax(260px, 1fr))`,
    [headerTemplate, selectedModels.length],
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth', // change to "auto" if you want instant jump
      });
    }
  }, [pairs]);

  return (
    <>
      <div
        ref={scrollRef}
        className="relative rounded-lg border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 px-3 lg:px-4 pt-2 overflow-x-auto flex-1 overflow-y-auto pb-28 sm:scroll-stable-gutter"
      >
        {selectedModels.length === 0 ? (
          <div className="p-4 text-zinc-500 dark:text-zinc-400">
            Select up to 5 models to compare.
          </div>
        ) : (
          <div className="min-w-full space-y-3">
            {/* Header row: model labels */}
            <div
              className="grid min-w-full gap-3 items-center overflow-visible mt-0 sticky top-0 left-0 right-0 z-30 -mx-3 px-3 lg:-mx-4 lg:px-4 py-1 rounded-t-lg shadow-[0_1px_0_rgba(0,0,0,0.4)] bg-transparent border-0 sm:bg-black/40 dark:sm:bg-black/40 sm:backdrop-blur-sm sm:border-b sm:border-black/10 dark:sm:border-white/10"
              style={{ gridTemplateColumns: headerCols }}
            >
              {selectedModels.map((m) => {
                const isFree = /(\(|\s)free\)/i.test(m.label);
                const isCollapsed = collapsedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`px-2.5 py-2 sm:px-2 sm:py-2 min-h-[42px] min-w-fit flex items-center ${
                      isCollapsed ? 'justify-center' : 'justify-between'
                    } overflow-visible rounded-lg backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.25)] ring-1 ${
                      m.good
                        ? 'ring-amber-300/35 bg-gradient-to-b from-amber-500/10 to-black/50'
                        : 'ring-white/10 bg-black/55'
                    } dark:${
                      m.good
                        ? 'ring-amber-300/35 from-amber-400/10 to-black/60'
                        : 'ring-white/10 bg-black/60'
                    }`}
                  >
                    {!isCollapsed && (
                      <div
                        className={`text-[12px] leading-normal font-medium pr-2 inline-flex items-center gap-1.5 min-w-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.35)] sm:drop-shadow-none ${
                          m.good || isFree
                            ? 'opacity-100 text-black dark:text-white'
                            : 'opacity-100 text-black dark:text-white sm:opacity-90'
                        }`}
                      >
                        {m.good && (
                          <span className="badge-base badge-pro inline-flex items-center gap-1 h-6 self-center">
                            <Star size={11} />
                            <span className="hidden sm:inline">Pro</span>
                          </span>
                        )}
                        {isFree && (
                          <span className="badge-base badge-free inline-flex items-center gap-1 h-6 self-center">
                            <span className="hidden sm:inline">Free</span>
                          </span>
                        )}
                        <span
                          className="truncate max-w-[18ch] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[12px]"
                          title={m.label}
                        >
                          {m.label}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">

                      <button
                        key={m.id}
                        onClick={() => onToggle(m.id)}
                        className={`icon-btn text-black dark:text-white cursor-pointer ${
                          m.good
                            ? 'model-chip-pro'
                            : isFree
                              ? 'model-chip-free'
                              : 'border-black/10 dark:border-white/10'
                        }`}
                        data-selected={true}
                        data-type={m.good ? 'pro' : isFree ? 'free' : 'other'}
                        title="Click to toggle"
                      >
                        <Minus
                          size={16}
                          data-type={m.good ? 'pro' : 'free'}
                          data-active={true}
                        />
                      </button>

                      {isCollapsed ? (
                        <button
                          onClick={() =>
                            setCollapsedIds((prev) => prev.filter((id) => id !== m.id))
                          }
                          className="icon-btn h-7 w-7 accent-focus"
                          title={`Expand ${m.label}`}
                        >
                          <EyeOff size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setCollapsedIds((prev) => [...prev, m.id])}
                          className="icon-btn h-7 w-7 accent-focus"
                          title={`Collapse ${m.label}`}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pairs.map((row, i) => (
              <div key={i} className="space-y-3">
                {/* User prompt as right-aligned red pill */}
                <div className="px-2 flex justify-end">
                  <div className="max-w-[68ch]">
                    <div className="relative">
                      {editingIdx === i ? (
                        <div className="ml-auto">
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="w-full min-h-[40px] max-w-[68ch] text-sm leading-relaxed px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                            placeholder="Edit your message..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (draft.trim()) {
                                  onEditUser(i, draft.trim());
                                  setEditingIdx(null);
                                  setDraft('');
                                }
                              } else if (e.key === 'Escape') {
                                setEditingIdx(null);
                                setDraft('');
                              }
                            }}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              onClick={() => {
                                if (draft.trim()) {
                                  onEditUser(i, draft.trim());
                                  setEditingIdx(null);
                                  setDraft('');
                                }
                              }}
                              className="px-3 py-1 text-xs rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingIdx(null);
                                setDraft('');
                              }}
                              className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="ml-auto inline-flex items-center text-sm leading-relaxed px-3 py-1.5 rounded-2xl bg-[var(--accent-interactive-primary)] text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                            <span className="truncate whitespace-pre-wrap break-words max-w-[68ch]">
                              {row.user.content}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-end gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingIdx(i);
                                setDraft(row.user.content);
                              }}
                              className="icon-btn h-7 w-7 accent-focus"
                              title="Edit message"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteUser(i)}
                              className="icon-btn h-7 w-7 accent-focus"
                              title="Delete message"
                            >
                              <Trash size={14} />
                            </button>
                            <CopyToClipboard getText={() => row.user.content} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="grid gap-3 items-stretch"
                  style={{ gridTemplateColumns: headerCols }}
                >
                  {selectedModels.map((m) => {
                    const ans = row.answers.find((a) => a.modelId === m.id);
                    const isCollapsed = collapsedIds.includes(m.id);
                    return (
                      <div key={m.id} className="h-full">
                        <div
                          className={`group relative rounded-lg ${
                            isCollapsed ? 'p-2.5' : 'p-3'
                          } h-full min-h-[140px] flex overflow-hidden ring-1 transition-shadow bg-gradient-to-b from-black/40 to-black/20 ring-white/10 backdrop-blur-[2px] ${
                            isCollapsed ? 'cursor-pointer' : 'hover:ring-white/20'
                          }`}
                          onClick={() => {
                            if (isCollapsed)
                              setCollapsedIds((prev) => prev.filter((id) => id !== m.id));
                          }}
                          title={isCollapsed ? 'Click to expand' : undefined}
                        >
                          {/* decorative overlay removed for cleaner look */}
                          {ans && String(ans.content || '').length > 0 && (
                            <div
                              className={`absolute top-2 right-2 z-10 flex flex-col gap-2 ${
                                isCollapsed
                                  ? 'opacity-0 pointer-events-none'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <button
                                onClick={() =>
                                  setPendingDelete({
                                    type: 'answer',
                                    turnIndex: i,
                                    modelId: m.id,
                                  })
                                }
                                className="icon-btn h-7 w-7 accent-focus"
                                title={`Delete ${m.label} response`}
                              >
                                <Trash size={12} />
                              </button>

                              {selectedModels.length - 1 !== collapsedIds.length ? (
                                <button
                                  onClick={() => {
                                    setCollapsedIds(
                                      () => selectedModels.map((i) => (i.id === m.id ? "NAI" : i.id )).filter((id) => id !== "NAI"),
                                    );
                                  }}
                                  className="icon-btn h-7 w-7 accent-focus"
                                  title={`Expand ${m.label} response`}
                                >
                                  <Expand size={12} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setCollapsedIds(() => [])}
                                  className="icon-btn h-7 w-7 accent-focus"
                                  title={`Shrink ${m.label} response`}
                                >
                                  <Shrink size={12} />
                                </button>
                              )}

                              <CopyToClipboard
                                getText={() => sanitizeContent(ans.content)}
                                title={`Copy ${m.label} response`}
                              />
                            </div>
                          )}
                          <div className="relative">
                            <div
                              className={`text-sm leading-relaxed w-full pr-8 ${
                                isCollapsed ? 'overflow-hidden max-h-20 opacity-70' : 'space-y-2'
                              } ${
                                !isCollapsed
                                  ? 'max-h-[40vh] md:max-h-[400px] overflow-y-auto custom-scrollbar'
                                  : ''
                              }`}
                              style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                              {ans &&
                              String(ans.content || '').length > 0 &&
                              !['Thinking…', 'Typing…'].includes(String(ans.content)) ? (
                                <>
                                  <div className="max-w-[72ch] rounded-2xl bg-white/10 ring-1 ring-white/10 px-3 py-2">
                                    <MarkdownLite text={sanitizeContent(ans.content)} />
                                  </div>
                                  {/* Token usage footer */}
                                  {ans.tokens &&
                                    !isCollapsed &&
                                    (() => {
                                      const by = ans.tokens?.by;
                                      const model = ans.tokens?.model;
                                      const inTokens = Array.isArray(ans.tokens?.perMessage)
                                        ? ans.tokens!.perMessage!.reduce(
                                            (sum, x) => sum + (Number(x?.tokens) || 0),
                                            0,
                                          )
                                        : (ans.tokens?.total ?? undefined);
                                      const outTokens = estimateTokens(String(ans.content || ''));
                                      return (
                                        <div className="mt-2 text-[11px] text-zinc-300/80">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5">
                                            {typeof inTokens === 'number' && (
                                              <span className="opacity-80">In:</span>
                                            )}
                                            {typeof inTokens === 'number' && (
                                              <span className="font-medium">{inTokens}</span>
                                            )}
                                            <span className="opacity-80">Out:</span>
                                            <span className="font-medium">{outTokens}</span>
                                            {by && <span className="opacity-70">• {by}</span>}
                                            {model && <span className="opacity-70">• {model}</span>}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  {ans.code === 503 && ans.provider === 'openrouter' && (
                                    <div className="mt-2 inline-flex items-center gap-2 text-xs text-amber-200/90 bg-amber-500/15 ring-1 ring-amber-300/30 px-2.5 py-1.5 rounded">
                                      <span>
                                        Free pool temporarily unavailable (503). Try again soon,
                                        switch model, or add your own OpenRouter API key for higher
                                        limits.
                                      </span>
                                      <button
                                        onClick={() =>
                                          window.dispatchEvent(new Event('open-settings'))
                                        }
                                        className="ml-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                      >
                                        Add key
                                      </button>
                                    </div>
                                  )}
                                  {(() => {
                                    try {
                                      const txt = String(ans.content || '');
                                      const show =
                                        /add your own\s+(?:openrouter|gemini)\s+api key/i.test(txt);
                                      return show;
                                    } catch {
                                      return false;
                                    }
                                  })() && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() =>
                                          window.dispatchEvent(new Event('open-settings'))
                                        }
                                        className="text-xs px-2.5 py-1 rounded text-white border border-white/10 accent-action-fill"
                                      >
                                        Add keys
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : loadingIds.includes(m.id) ||
                                (ans && ['Thinking…', 'Typing…'].includes(String(ans.content))) ? (
                                <div className="w-full self-stretch">
                                  <div className="inline-flex items-center gap-2 text-[12px] font-medium text-rose-100">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15">
                                      <span className="text-white/90">Thinking</span>
                                      <span className="inline-flex items-center gap-0.5" aria-hidden>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '240ms' }} />
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-zinc-400 text-sm">No response</span>
                              )}
                            </div>
                          </div>
                          {isCollapsed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-1 rounded-full border border-white/10 bg-black/50 inline-flex items-center gap-1">
                                <Eye size={12} /> Expand
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.type === 'turn' ? 'Delete this turn?' : 'Delete model answer?'}
        message={
          pendingDelete?.type === 'turn'
            ? 'This will remove your prompt and all model answers for this turn.'
            : "This will remove the selected model's response for this turn."
        }
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === 'turn') {
            onDeleteUser(pendingDelete.turnIndex);
          } else {
            onDeleteAnswer(pendingDelete.turnIndex, pendingDelete.modelId);
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}
