import ReadingRuler from "./ReadingRuler";
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

const sectionTitleClass = "text-lg font-black text-[#0f2d4a]";
const softCardClass = "rounded-lg border border-[#d8e2ea] bg-white p-4 shadow-sm";

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
  const ragContexts = Array.isArray(material.rag?.contexts) ? material.rag.contexts.filter(Boolean) : [];
  const ragTopK = Number.isFinite(Number(material.rag?.topK)) ? Number(material.rag.topK) : ragContexts.length;
  const mapNodes = parseVisualMap(material.visualMap || "", material.conceptMap);

  return (
    <article
      className={`relative overflow-visible rounded-lg border p-5 [overflow-wrap:anywhere] ${
        highContrast
          ? "border-white bg-[#07111f] text-white"
          : "border-[#d8e2ea] bg-[#fbfcf8] text-[#12324a]"
      }`}
      style={{
        fontFamily: settings.font_preference,
        fontSize: settings.font_size,
        lineHeight: settings.line_height,
        letterSpacing: `${settings.letter_spacing}px`,
      }}
    >
      <div className="relative z-10 flex min-w-0 flex-col gap-5">
        <header className="flex min-w-0 flex-col gap-4 border-b border-[#d8e2ea] pb-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className={`text-sm font-bold ${highContrast ? "text-[#9ee6c5]" : "text-[#2c6e63]"}`}>
              Material de estudo adaptado
            </p>
            <h2 className={`mt-1 break-words text-2xl font-black ${highContrast ? "text-white" : "text-[#061c44]"}`}>
              {material.title}
            </h2>
            <p className={`mt-2 truncate text-sm ${highContrast ? "text-[#dce8f3]" : "text-[#52627f]"}`} title={material.sourceLabel}>
              {material.sourceLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2 md:items-end">
            <p
              className={`hidden rounded-lg px-3 py-2 text-sm font-bold sm:block ${
                highContrast
                  ? "border border-[#9ee6c5] text-[#9ee6c5]"
                  : "border border-[#b9d7c7] bg-[#eef8f1] text-[#2c6e63]"
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
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                highContrast
                  ? "border-white/40 bg-white/5 text-white hover:bg-white/10"
                  : "border-[#b9cbd9] bg-white text-[#0f2d4a] hover:bg-[#eef7ff]"
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
            className={`rounded-lg border px-4 py-3 text-sm font-bold ${
              downloadStatus === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : highContrast
                  ? "border-white/30 bg-white/5 text-[#9ee6c5]"
                  : "border-[#b9d7c7] bg-[#eef8f1] text-[#2c6e63]"
            }`}
          >
            {downloadMessage}
          </p>
        )}

        <section className={highContrast ? "rounded-lg border border-white/30 p-4" : "rounded-lg bg-[#e9f7ef] p-4"}>
          <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Resumo simples</h3>
          <p className="mt-3 max-w-3xl break-words">{material.summary}</p>
        </section>

        <section>
          <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Ideias principais</h3>
          <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {keyIdeas.map((idea, index) => (
              <div
                key={`${idea.title}-${index}`}
                className={
                  highContrast
                    ? "rounded-lg border border-white/30 bg-white/5 p-4"
                    : "rounded-lg border border-[#c7deed] bg-[#eef7ff] p-4"
                }
              >
                <h4 className="break-words font-black">{idea.title}</h4>
                <p className="mt-2 break-words text-sm">{idea.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Termos difíceis</h3>
            <dl className="mt-3 flex flex-col gap-3">
              {glossary.map((item, index) => (
                <div key={`${item.term}-${index}`}>
                  <dt className="break-words font-black">{item.term}</dt>
                  <dd className="mt-1 break-words text-sm">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Passo a passo</h3>
            <ol className="mt-3 flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                      highContrast ? "bg-white text-[#07111f]" : "bg-[#0f2d4a] text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-words">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={highContrast ? "rounded-lg border border-white/30 p-4" : "rounded-lg border border-[#d8e2ea] bg-white p-4"}>
          <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Mapa conceitual</h3>
          <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-3">
            {mapNodes.map((node, index) => (
              <div key={`${node.title}-${index}`} className="flex min-w-0 items-stretch gap-3">
                <div
                  className={`flex min-w-0 flex-1 flex-col justify-center rounded-lg border p-4 ${
                    highContrast
                      ? "border-white/40 bg-white/5"
                      : index === 1
                        ? "border-[#f0c56b] bg-[#fff4d6]"
                        : "border-[#b9d7c7] bg-[#eef8f1]"
                  }`}
                >
                  <h4 className="break-words font-black">{node.title}</h4>
                  <p className="mt-2 break-words text-sm">{node.description}</p>
                </div>
                {index < mapNodes.length - 1 && (
                  <span className="hidden items-center text-2xl font-black text-[#2c6e63] lg:flex">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Exemplos práticos</h3>
            <div className="mt-3 flex flex-col gap-3">
              {examples.map((example, index) => (
                <div key={`${example.title}-${index}`} className={highContrast ? "rounded-lg bg-white/5 p-3" : "rounded-lg bg-[#f4f8fb] p-3"}>
                  <h4 className="break-words font-black">{example.title}</h4>
                  <p className="mt-1 break-words text-sm">{example.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Fórmulas importantes</h3>
            <div className="mt-3 flex flex-col gap-3">
              {formulas.map((formula, index) => (
                <div key={`${formula.title}-${index}`} className={highContrast ? "rounded-lg bg-white/5 p-3" : "rounded-lg bg-[#fff7df] p-3"}>
                  <p className="break-words font-black">{formula.title}</p>
                  <p className="mt-1 break-words text-sm">{formula.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Guia de estudo</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {studyGuide.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-3">
                  <span className="font-black text-[#2c6e63]">✓</span>
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={highContrast ? "rounded-lg border border-white/30 p-4" : softCardClass}>
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>Quiz rápido</h3>
            <div className="mt-3 flex flex-col gap-3">
              {quiz.map((item, index) => (
                <details key={`${item.question}-${index}`} className={highContrast ? "rounded-lg bg-white/5 p-3" : "rounded-lg bg-[#f4f8fb] p-3"}>
                  <summary className="cursor-pointer break-words font-black">{item.question}</summary>
                  <p className="mt-2 break-words text-sm">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <details className={highContrast ? "rounded-lg border border-white/30 p-4" : "rounded-lg border border-[#d8e2ea] bg-white p-4"}>
          <summary className="cursor-pointer font-black">Detalhes técnicos da adaptação</summary>
          <div className="mt-4">
            <h3 className={highContrast ? "text-lg font-black text-white" : sectionTitleClass}>
              Base de acessibilidade consultada
            </h3>
            <p className={`mt-2 text-sm ${highContrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
              {ragContexts.length} trecho{ragContexts.length === 1 ? "" : "s"} recuperado
              {ragContexts.length === 1 ? "" : "s"}. Essas diretrizes orientaram a forma da adaptação.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className={highContrast ? "rounded-lg bg-white/10 px-3 py-2 font-bold" : "rounded-lg bg-[#eef8f1] px-3 py-2 font-bold text-[#2c6e63]"}>
                Recuperador: {material.rag?.retriever || "local-keyword"}
              </span>
              <span className={highContrast ? "rounded-lg bg-white/10 px-3 py-2 font-bold" : "rounded-lg bg-[#f4f8fb] px-3 py-2 font-bold text-[#52627f]"}>
                TopK: {ragTopK}
              </span>
              <span className={highContrast ? "rounded-lg bg-white/10 px-3 py-2 font-bold" : "rounded-lg bg-[#f4f8fb] px-3 py-2 font-bold text-[#52627f]"}>
                Modo: {material.mode === "ai_real" ? "IA real" : "fallback"}
              </span>
            </div>
            {material.notice && (
              <p className={`mt-3 text-sm ${highContrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                {material.notice}
              </p>
            )}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {ragContexts.map((context, index) => (
                <div
                  key={context.id || `rag-context-${index + 1}`}
                  className={
                    highContrast
                      ? "rounded-lg border border-white/30 bg-white/5 p-3"
                      : "rounded-lg border border-[#d8e2ea] bg-[#fbfcf8] p-3"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="break-words font-black">{context.title || "Diretriz de acessibilidade"}</h4>
                    <span className="shrink-0 rounded-lg bg-[#eef8f1] px-2 py-1 text-xs font-black text-[#2c6e63]">
                      {Number.isFinite(Number(context.score)) ? Number(context.score).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <p className={`mt-1 break-words text-xs ${highContrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                    {context.source || "base-local"}
                  </p>
                  <p className="mt-2 break-words text-sm">{context.contentPreview || "Trecho recuperado da base local de acessibilidade."}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      <ReadingRuler enabled={settings.ruler_enabled} overlayColor={settings.overlay_color} />
    </article>
  );
}
