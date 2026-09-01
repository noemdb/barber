import { prisma } from "@/lib/prisma";
import { requireRoleOrRedirect } from "@/lib/permissions";
import { BinnacleEntries } from "@/components/binnacle/binnacle-entries";

export const dynamic = "force-dynamic";

export default async function ClientBinnaclePage() {
  const session = await requireRoleOrRedirect("CLIENT");

  const entries = await prisma.binnacleEntry.findMany({
    where: { subjectId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Bitácora</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Eventos asociados a tu cuenta ({entries.length}).
        </p>
      </div>

      <BinnacleEntries entries={entries} />
    </div>
  );
}
