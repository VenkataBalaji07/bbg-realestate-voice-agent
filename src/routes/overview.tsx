import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Notice } from "@/components/app/kit";

export const Route = createFileRoute("/overview")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Overview — Estate Voice" },
      { name: "description", content: "Overview of calling campaigns, leads and usage." },
      { property: "og:title", content: "Overview — Estate Voice" },
      { property: "og:description", content: "Overview of calling campaigns, leads and usage." },
    ],
  }),
  component: Overview,
});

function Overview() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader eyebrow="Development preview" title="Overview" description="The full dashboard sections are not built yet." />
      <Notice>This prototype is unfinished. Data stays in this browser and no calls are ever placed. <Link to="/" className="underline">Back to sign in</Link></Notice>
    </div>
  );
}
