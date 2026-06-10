interface Props {
  variant?: "student" | "teacher";
}

export default function AppLogo({ variant = "student" }: Props) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f7fb] ring-1 ring-[#d8ddea]"
      aria-hidden="true"
    >
      <svg className="h-6 w-6" viewBox="0 0 32 32" fill="none">
        <path d="M8 8c3.7-.8 6 .1 8 2.4v14.2c-2-2.3-4.3-3.2-8-2.4V8Z" fill="#ffffff" stroke="#152b52" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 10.4C18 8.1 20.3 7.2 24 8v14.2c-3.7-.8-6-.1-8 2.4V10.4Z" fill="#ffffff" stroke="#152b52" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6 11.5h3.2v11.8H6z" fill="#62d2a2" />
        <path d="M22.8 11.5H26v11.8h-3.2z" fill="#64b5ff" />
        {variant === "teacher" ? (
          <>
            <path d="M10 7.5 16 4.8l6 2.7-6 2.7-6-2.7Z" fill="#ffb84d" stroke="#152b52" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M22 8.2v4.2" stroke="#152b52" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M10.6 7.2h3.2v3.5h-3.2z" fill="#ff7a3d" />
            <path d="M18.2 7.2h3.2v3.5h-3.2z" fill="#d7a4e5" />
          </>
        )}
      </svg>
    </span>
  );
}
