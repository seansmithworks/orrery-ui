import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const INITIAL = [
  { id: 1, name: "Ada Okafor", role: "Flight engineer" },
  { id: 2, name: "Bo Lindqvist", role: "Navigator" },
  { id: 3, name: "Chen Wei", role: "Pilot" },
  { id: 4, name: "Dara Moss", role: "Medic" },
  { id: 5, name: "Eli Hart", role: "Comms" },
];

const hit = "min-h-[var(--hit-target-min)]";

export default function Crew() {
  const [crew, setCrew] = useState(INITIAL);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = crew.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Crew</h1>
        <div className="space-y-2">
          <Label htmlFor="crew-filter">Filter crew</Label>
          <Input
            id="crew-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={hit}
          />
        </div>

        {shown.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card text-card-foreground">
            {shown.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.role}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${p.name}`}
                      className="min-h-[var(--hit-target-min)] min-w-[var(--hit-target-min)]"
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className={hit}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className={hit}>Reassign</DropdownMenuItem>
                    <DropdownMenuItem
                      className={hit}
                      onSelect={() =>
                        setCrew((c) => c.filter((x) => x.id !== p.id))
                      }
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-border p-6 text-center space-y-3">
            <p role="status" className="text-muted-foreground">
              No crew match your filter.
            </p>
            <Button variant="outline" className={hit} onClick={() => setQuery("")}>
              Clear filter
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
