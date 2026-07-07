import { useEffect, useRef, useState } from "react";
import type { ReadingSettingsValue } from "./ReadingSettings";
import type { RagMetadata } from "../services/pdfReaderApi";

export interface StudyCard {
  title: string;
  description: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface QuizItem {
  question: string;
  answer: string;
}

export interface AdaptedStudyMaterialData {
  title: string;
  sourceLabel: string;
  summary: string;
  keyIdeas: StudyCard[];
  glossary: GlossaryItem[];
  steps: string[];
  visualMap: string;
  conceptMap?: StudyCard[];
  examples: StudyCard[];
  formulas: StudyCard[];
  studyGuide: string[];
  quiz: QuizItem[];
  mode: "ai_real" | "fallback";
  notice?: string;
  rag: RagMetadata;
}

interface Props {
  material: AdaptedStudyMaterialData;
  settings: ReadingSettingsValue;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadMessage?: string;
  downloadStatus?: "idle" | "generating" | "success" | "error";
}

const LINE_HEIGHT_PX = 32; // approx line height at default settings (18px * 1.8)
const RULER_THRESHOLD_LINES = 5;

const RULER_H = 40;

function RulerButton({ onClick, highContrast, active }: { onClick: () => void; highContrast: boolean; active: boolean }) {
  const label = active ? "Desativar régua" : "Ativar régua";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`mb-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active
          ? highContrast
            ? "border border-white/50 bg-white/15 text-white hover:bg-white/25"
            : "border border-[#10b981] bg-[#10b981] text-white hover:bg-[#059669]"
          : highContrast
            ? "border border-white/30 bg-white/5 text-[#9ee6c5] hover:bg-white/10"
            : "border border-[#a7f3d0] bg-[#d1fae5] text-[#047857] hover:bg-[#bbf7d0]"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
      {label}
    </button>
  );
}

function CardBody({
  children,
  className,
  overlayColor = "#FFF3CD",
  highContrast,
}: {
  children: React.ReactNode;
  className?: string;
  overlayColor?: string;
  highContrast: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLong, setIsLong] = useState(false);
  const [rulerEnabled, setRulerEnabled] = useState(false);
  const [rulerY, setRulerY] = useState<number | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    setIsLong(contentRef.current.scrollHeight / LINE_HEIGHT_PX > RULER_THRESHOLD_LINES);
  }, []);

  useEffect(() => {
    if (!rulerEnabled || !isLong) { setRulerY(null); return; }

    function onMove(e: MouseEvent) {
      const outer = outerRef.current;
      const content = contentRef.current;
      if (!outer || !content) return;
      const outerRect = outer.getBoundingClientRect();
      const inside =
        e.clientX >= outerRect.left && e.clientX <= outerRect.right &&
        e.clientY >= outerRect.top && e.clientY <= outerRect.bottom;
      if (!inside) { setRulerY(null); return; }
      setRulerY(e.clientY - content.getBoundingClientRect().top);
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rulerEnabled, isLong]);

  const showRuler = rulerEnabled && isLong && rulerY !== null;

  return (
    <div ref={outerRef} className={`relative ${className ?? ""}`}>
      {isLong && (
        <RulerButton
          onClick={() => setRulerEnabled((r) => !r)}
          highContrast={highContrast}
          active={rulerEnabled}
        />
      )}
      <div ref={contentRef} className="relative">
        {showRuler && (
          <>
            {/* highlight line na posição do cursor */}
            <div
              className="pointer-events-none absolute inset-x-0 z-20 border-y-2 border-[#f4c400] opacity-75"
              style={{ top: rulerY - RULER_H / 2, height: RULER_H, backgroundColor: overlayColor }}
              aria-hidden="true"
            />
            {/* blur no texto abaixo da régua */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
              style={{ top: rulerY + RULER_H / 2, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
              aria-hidden="true"
            />
          </>
        )}
        {children}
      </div>
    </div>
  );
}

const sectionTitleClass = "border-l-4 border-[#10b981] pl-3 text-xl font-extrabold text-[#064e3b]";
const softCardClass = "rounded-2xl border border-[#a7f3d0] bg-white/80 p-6";

function Md({ text }: { text: string }) {
  // Strip "* " bullet markers at start of string or after newlines
  const processed = text.replace(/^\*\s+/gm, "");
  const parts: (string | React.JSX.Element)[] = [];
  // Order matters: **bold** before *italic* so ** is consumed first
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*(?!\*)[^*\n]+\*(?!\*))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(processed)) !== null) {
    if (match.index > lastIndex) parts.push(processed.slice(lastIndex, match.index));
    const m = match[0];
    if (m.startsWith("**")) {
      parts.push(<strong key={key++}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded bg-[#d1fae5] px-1 font-mono text-[0.875em] text-[#047857]">
          {m.slice(1, -1)}
        </code>,
      );
    } else {
      // *label* → semibold accent (avoid italic which is harder to read for dyslexics)
      parts.push(<span key={key++} className="font-semibold text-[#047857]">{m.slice(1, -1)}</span>);
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < processed.length) parts.push(processed.slice(lastIndex));
  return <>{parts}</>;
}

function parseVisualMap(visualMap: string, fallback?: StudyCard[]): StudyCard[] {
  const labels = Array.from(visualMap.matchAll(/\[([^\]]+)\]/g)).map((match) => match[1].trim());
  const unique = labels.filter((label, index) => labels.indexOf(label) === index);

  if (unique.length > 0) {
    return unique.slice(0, 5).map((label, index) => ({
      title: label,
      description: index === 0 ? "Conceito central" : "Ideia relacionada",
    }));
  }

  return fallback?.length
    ? fallback
    : [
        { title: "Conceito central", description: "Tema principal do trecho." },
        { title: "Ideias relacionadas", description: "Pontos que ajudam a entender o conteúdo." },
        { title: "Revisão", description: "Perguntas para conferir o aprendizado." },
      ];
}

function safeCards(value: StudyCard[] | undefined, fallback: StudyCard[]): StudyCard[] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .filter((item) => item?.title || item?.description)
    .map((item) => ({
      title: item.title || "Ideia importante",
      description: item.description || "Revise este ponto com atenção.",
    }));
  return cards.length ? cards : fallback;
}

function safeGlossary(value: GlossaryItem[] | undefined): GlossaryItem[] {
  if (!Array.isArray(value)) {
    return [{ term: "Ideia principal", definition: "O ponto mais importante do trecho." }];
  }

  const items = value
    .filter((item) => item?.term || item?.definition)
    .map((item) => ({
      term: item.term || "Termo importante",
      definition: item.definition || "Definição simples.",
    }));

  return items.length ? items : [{ term: "Ideia principal", definition: "O ponto mais importante do trecho." }];
}

function safeStringList(value: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  return items.length ? items : fallback;
}

function safeQuiz(value: QuizItem[] | undefined): QuizItem[] {
  if (!Array.isArray(value)) {
    return [{ question: "O que você entendeu deste trecho?", answer: "Explique com suas palavras." }];
  }

  const items = value
    .filter((item) => item?.question || item?.answer)
    .map((item) => ({
      question: item.question || "O que você entendeu deste trecho?",
      answer: item.answer || "Explique com suas palavras.",
    }));

  return items.length ? items : [{ question: "O que você entendeu deste trecho?", answer: "Explique com suas palavras." }];
}

export default function AdaptedStudyMaterial({
  material,
  settings,
  onDownload,
  isDownloading = false,
  downloadMessage = "",
  downloadStatus = "idle",
}: Props) {
  const highContrast = settings.high_contrast;
  const keyIdeas = safeCards(material.keyIdeas, [
    { title: "Ideia principal", description: "Leia o resumo e encontre o ponto central do trecho." },
  ]);
  const examples = safeCards(material.examples, [
    { title: "Exemplo de revisão", description: "Explique uma ideia do trecho com uma frase curta." },
  ]);
  const formulas = safeCards(material.formulas, [
    { title: "Fórmulas ou regras", description: "Se houver fórmula, revise uma por vez." },
  ]);
  const glossary = safeGlossary(material.glossary);
  const steps = safeStringList(material.steps, ["Leia o resumo.", "Revise os cards.", "Responda ao quiz."]);
  const studyGuide = safeStringList(material.studyGuide, ["Comece pelo resumo.", "Depois revise o glossário.", "Finalize com o quiz."]);
  const quiz = safeQuiz(material.quiz);
  const mapNodes = parseVisualMap(material.visualMap || "", material.conceptMap);

  return (
    <article
      className={`relative overflow-visible rounded-2xl border p-6 [overflow-wrap:anywhere] ${
        highContrast
          ? "border-white bg-[#07111f] text-white"
          : "border-white/60 bg-white/80 text-[#064e3b] shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
      }`}
      style={{
        fontSize: settings.font_size,
        lineHeight: settings.line_height,
        letterSpacing: `${settings.letter_spacing}px`,
      }}
    >
      <div className="relative z-10 flex min-w-0 flex-col gap-10">
        <header
          className={`flex min-w-0 flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between ${
            highContrast ? "border-white/30" : "border-[#a7f3d0]"
          }`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-bold ${highContrast ? "text-[#9ee6c5]" : "text-[#10b981]"}`}>
              Material de estudo adaptado
            </p>
            <h2 className={`mt-1 break-words text-2xl font-extrabold ${highContrast ? "text-white" : "text-[#064e3b]"}`}>
              {material.title}
            </h2>
            <p
              className={`mt-2 truncate text-sm font-semibold ${highContrast ? "text-[#dce8f3]" : "text-[#047857]"}`}
              title={material.sourceLabel}
            >
              {material.sourceLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2 md:items-end">
            <p
              className={`hidden rounded-xl px-3 py-2 text-sm font-bold sm:block ${
                highContrast
                  ? "border border-[#9ee6c5] text-[#9ee6c5]"
                  : "border border-[#6ee7b7] bg-[#d1fae5] text-[#064e3b]"
              }`}
            >
              Adaptação concluída
            </p>
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading || !onDownload}
              aria-label="Baixar adaptação em PDF"
              title="Baixar adaptação em PDF"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                highContrast
                  ? "border-white/40 bg-white/5 text-white hover:bg-white/10"
                  : "border-[#a7f3d0] bg-white/80 text-[#064e3b] hover:bg-[#f0fdf4]"
              }`}
            >
              {isDownloading ? (
                <span className="h-5 w-5 animate-pulse rounded-full border-2 border-current" aria-hidden="true" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                  <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {downloadMessage && (
          <p
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              downloadStatus === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : highContrast
                  ? "border-white/30 bg-white/5 text-[#9ee6c5]"
                  : "border-[#6ee7b7] bg-[#d1fae5] text-[#064e3b]"
            }`}
          >
            {downloadMessage}
          </p>
        )}

        {/* Resumo simples */}
        <section className={highContrast ? "rounded-2xl border border-white/30 p-6" : "rounded-2xl bg-[#d1fae5] p-6"}>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Resumo simples
          </h3>
          <CardBody overlayColor={settings.overlay_color} highContrast={highContrast}>
            <p className="mt-5 max-w-3xl break-words text-base leading-loose">
              <Md text={material.summary} />
            </p>
          </CardBody>
        </section>

        {/* Ideias principais — 2 colunas máximo */}
        <section>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Ideias principais
          </h3>
          <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
            {keyIdeas.map((idea, index) => (
              <CardBody
                key={`${idea.title}-${index}`}
                className={
                  highContrast
                    ? "rounded-2xl border border-white/30 bg-white/5 p-5"
                    : "rounded-2xl border border-[#a7f3d0] bg-[#f0fdf4] p-5"
                }
                overlayColor={settings.overlay_color}
                highContrast={highContrast}
              >
                <h4 className="break-words text-base font-extrabold">
                  <Md text={idea.title} />
                </h4>
                <p className="mt-3 break-words text-base leading-loose">
                  <Md text={idea.description} />
                </p>
              </CardBody>
            ))}
          </div>
        </section>

        {/* Termos difíceis — full width */}
        <section className={highContrast ? "rounded-2xl border border-white/30 p-6" : softCardClass}>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Termos difíceis
          </h3>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {glossary.map((item, index) => (
              <CardBody
                key={`${item.term}-${index}`}
                className={highContrast ? "rounded-xl bg-white/5 p-4" : "rounded-xl bg-[#f0fdf4] p-4"}
                overlayColor={settings.overlay_color}
                highContrast={highContrast}
              >
                <dt className="break-words text-base font-extrabold">
                  <Md text={item.term} />
                </dt>
                <dd className="mt-2 break-words text-base leading-loose">
                  <Md text={item.definition} />
                </dd>
              </CardBody>
            ))}
          </dl>
        </section>

        {/* Passo a passo — full width */}
        <section className={highContrast ? "rounded-2xl border border-white/30 p-6" : softCardClass}>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Passo a passo
          </h3>
          <CardBody overlayColor={settings.overlay_color} highContrast={highContrast}>
            <ol className="mt-5 flex flex-col gap-6">
              {steps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white ${
                      highContrast ? "bg-white !text-[#07111f]" : ""
                    }`}
                    style={highContrast ? undefined : { background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-words pt-1 text-base leading-loose">
                    <Md text={step} />
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </section>

        {/* Mapa conceitual */}
        <section className={highContrast ? "rounded-2xl border border-white/30 p-6" : "rounded-2xl border border-[#a7f3d0] bg-white/80 p-6"}>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Mapa conceitual
          </h3>
          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
            {mapNodes.map((node, index) => (
              <div key={`${node.title}-${index}`} className="flex min-w-0 items-stretch gap-3">
                <div
                  className={`flex min-w-0 flex-1 flex-col justify-center rounded-xl border p-5 ${
                    highContrast
                      ? "border-white/40 bg-white/5"
                      : index === 1
                        ? "border-[#fde68a] bg-[#fef9c3]"
                        : "border-[#a7f3d0] bg-[#d1fae5]"
                  }`}
                >
                  <h4 className="break-words text-base font-extrabold">
                    <Md text={node.title} />
                  </h4>
                  <p className="mt-2 break-words text-sm leading-loose">
                    <Md text={node.description} />
                  </p>
                </div>
                {index < mapNodes.length - 1 && (
                  <span className="hidden items-center text-2xl font-bold text-[#10b981] lg:flex">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Exemplos práticos — 2 colunas */}
        <section>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Exemplos práticos
          </h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {examples.map((example, index) => (
              <CardBody
                key={`${example.title}-${index}`}
                className={
                  highContrast
                    ? "rounded-2xl border border-white/30 bg-white/5 p-5"
                    : "rounded-2xl border border-[#a7f3d0] bg-[#f0fdf4] p-5"
                }
                overlayColor={settings.overlay_color}
                highContrast={highContrast}
              >
                <h4 className="break-words text-base font-extrabold">
                  <Md text={example.title} />
                </h4>
                <p className="mt-3 break-words text-base leading-loose">
                  <Md text={example.description} />
                </p>
              </CardBody>
            ))}
          </div>
        </section>

        {/* Fórmulas importantes — 2 colunas */}
        <section>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Fórmulas importantes
          </h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {formulas.map((formula, index) => (
              <CardBody
                key={`${formula.title}-${index}`}
                className={
                  highContrast
                    ? "rounded-2xl bg-white/5 p-5"
                    : "rounded-2xl border border-[#fde68a] bg-[#fef9c3] p-5"
                }
                overlayColor={settings.overlay_color}
                highContrast={highContrast}
              >
                <p className="break-words text-base font-extrabold">
                  <Md text={formula.title} />
                </p>
                <p className="mt-3 break-words text-base leading-loose">
                  <Md text={formula.description} />
                </p>
              </CardBody>
            ))}
          </div>
        </section>

        {/* Guia de estudo — full width */}
        <section className={highContrast ? "rounded-2xl border border-white/30 p-6" : softCardClass}>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Guia de estudo
          </h3>
          <CardBody overlayColor={settings.overlay_color} highContrast={highContrast}>
            <ul className="mt-5 flex flex-col gap-5">
              {studyGuide.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-4">
                  <span className="mt-1 shrink-0 text-base font-bold text-[#10b981]">✓</span>
                  <span className="min-w-0 break-words text-base leading-loose">
                    <Md text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </section>

        {/* Quiz rápido — full width */}
        <section>
          <h3 className={highContrast ? "border-l-4 border-white pl-3 text-xl font-extrabold text-white" : sectionTitleClass}>
            Quiz rápido
          </h3>
          <div className="mt-5 flex flex-col gap-5">
            {quiz.map((item, index) => (
              <details
                key={`${item.question}-${index}`}
                className={
                  highContrast
                    ? "rounded-2xl border border-white/30 bg-white/5 p-5"
                    : "rounded-2xl border border-[#a7f3d0] bg-[#f0fdf4] p-5"
                }
              >
                <summary className="cursor-pointer break-words text-base font-extrabold leading-loose">
                  <Md text={item.question} />
                </summary>
                <p
                  className={`mt-4 break-words border-t pt-4 text-base leading-loose ${
                    highContrast ? "border-white/20" : "border-[#a7f3d0]"
                  }`}
                >
                  <Md text={item.answer} />
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
