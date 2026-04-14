import Link from "next/link";
import Image from "next/image";

export default function SoknadSendtPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-3xl pb-16 pt-4">
        <div className="mb-16 flex items-center justify-between">
          <Image
            src="/logo/APARENT_DOUBLE_BLACK.png"
            alt="Aparent"
            width={128}
            height={20}
            priority
            className="h-auto w-[128px]"
          />
        </div>

        <div className="border-t border-[color:var(--line)] pt-10">
          <h1 className="text-[12px] uppercase tracking-[0.2em] text-[color:var(--fg)]">
            Søknad sendt inn.
          </h1>

          <p className="mt-8 max-w-2xl text-[12px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
            Takk for din søknad. I løpet av uke 17 vil vi ta kontakt med potensielle kandidater.
          </p>

          <p className="mt-10 text-[12px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
            Med vennlig hilsen,
            <br />
            Aparent family
          </p>

          <div className="mt-14">
            <Link
              href="/"
              className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--fg)] transition-colors hover:text-[color:var(--muted)]"
            >
              Tilbake til skjema
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
