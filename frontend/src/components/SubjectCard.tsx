import type { Subject } from "../data/mockLibrary";

interface Props {
  subject: Subject;
  onClick: () => void;
}

export default function SubjectCard({ subject, onClick }: Props) {
  const hasNewActivity = subject.materials.some((material) => material.hasNewActivity);
  const topColorClass = getSubjectTopColor(subject.id);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group h-[244px] overflow-hidden rounded-xl bg-white text-left shadow-[0_8px_18px_rgba(15,23,42,0.12)] ring-1 ring-[#d9d6cf] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-[#152b52]/15"
    >
      <div className={`${topColorClass} flex h-[116px] items-center justify-center`}>
        <SubjectIcon subjectId={subject.id} />
      </div>

      <div className="flex h-[128px] flex-col justify-center gap-3 px-5">
        <h2 className="text-2xl font-black text-[#061c44]">{subject.name}</h2>

        {hasNewActivity ? (
          <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-[#152b52] px-3 py-1 text-[11px] font-black leading-none text-white">
            <span className="text-yellow-300" aria-hidden="true">
              ✨
            </span>
            Nova atividade postada pelo seu professor hoje
          </span>
        ) : (
          <span className="text-sm font-medium text-[#5c6c87] group-hover:text-[#152b52]">
            Clique para continuar
          </span>
        )}
      </div>
    </button>
  );
}

function getSubjectTopColor(subjectId: string) {
  if (subjectId === "historia") return "bg-[#ffdcaa]";
  if (subjectId === "geografia") return "bg-[#aee6ce]";
  if (subjectId === "matematica") return "bg-[#d7ace1]";
  if (subjectId === "ciencias") return "bg-[#a7ddf2]";
  return "bg-[#ffb7a8]";
}

function SubjectIcon({ subjectId }: { subjectId: string }) {
  const common = "h-14 w-14 stroke-[#4b5872]";

  if (subjectId === "historia") {
    return (
      <svg className={common} viewBox="0 0 64 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M31 18c-5-6-15-6-22-3v34c7-3 17-3 22 3V18Z" />
        <path d="M33 18c5-6 15-6 22-3v34c-7-3-17-3-22 3V18Z" />
        <path d="M32 18v34" />
      </svg>
    );
  }

  if (subjectId === "geografia") {
    return (
      <svg className={common} viewBox="0 0 64 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M32 57s17-16 17-32a17 17 0 1 0-34 0c0 16 17 32 17 32Z" />
        <circle cx="32" cy="25" r="6" />
      </svg>
    );
  }

  if (subjectId === "matematica") {
    return (
      <svg className={common} viewBox="0 0 64 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="18" y="8" width="28" height="48" rx="4" />
        <path d="M25 18h14" />
        <circle cx="26" cy="30" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="32" cy="30" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="38" cy="30" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="26" cy="38" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="32" cy="38" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="38" cy="38" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="26" cy="46" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="32" cy="46" r="1.5" fill="#4b5872" stroke="none" />
        <circle cx="38" cy="46" r="1.5" fill="#4b5872" stroke="none" />
      </svg>
    );
  }

  if (subjectId === "ciencias") {
    return (
      <svg className={common} viewBox="0 0 64 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M24 8h16" />
        <path d="M28 8v16L18 52a5 5 0 0 0 5 4h18a5 5 0 0 0 5-4L36 24V8" />
        <path d="M22 42h20" />
      </svg>
    );
  }

  return (
    <svg className={common} viewBox="0 0 64 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="32" cy="32" r="20" />
      <path d="M12 32h40" />
      <path d="M32 12c7 7 10 14 10 20s-3 13-10 20c-7-7-10-14-10-20s3-13 10-20Z" />
    </svg>
  );
}
