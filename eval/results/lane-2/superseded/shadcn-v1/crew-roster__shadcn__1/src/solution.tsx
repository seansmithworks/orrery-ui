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

type Person = { id: number; name: string; role: string };

const INITIAL: Person[] = [
  { id: 1, name: "Ada Okafor", role: "Flight engineer" },
  { id: 2, name: "Bo Lindqvist", role: "Navigator" },
  { id: 3, name: "Chen Wei", role: "Pilot" },
  { id: 4, name: "Dara Moss", role: "Medic" },
  { id: 5, name: "Eli Hart", role: "Comms" },
];

export default function CrewRoster() {
  const [crew, setCrew] = useState<Person[]>(INITIAL);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>

        <div className="space-y-2">
          <Label htmlFor="crew-filter">Filter crew</Label>
          <Input
            id="crew-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {visible.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card text-card-foreground">
            {visible.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {p.role}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Actions for ${p.name}`}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Reassign</DropdownMenuItem>
                    <DropdownMenuItem
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
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center"
          >
            <p className="text-muted-foreground">No crew match your filter.</p>
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear filter
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
