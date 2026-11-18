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

const touch = "min-h-[var(--hit-target-min)]";

export default function CrewRoster() {
  const [crew, setCrew] = useState<Person[]>(INITIAL);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <main className="mx-auto w-full max-w-[var(--layout-read)] bg-background p-6 text-foreground">
      <h1 className="mb-4 text-2xl font-semibold">Crew</h1>

      <div className="mb-4 flex flex-col gap-2">
        <Label htmlFor="crew-filter">Filter crew</Label>
        <Input
          id="crew-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${touch} text-base`}
          autoComplete="off"
        />
      </div>

      {visible.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-2"
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
                    className="min-h-[var(--hit-target-min)] min-w-[var(--hit-target-min)]"
                    aria-label={`Actions for ${p.name}`}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className={touch}>Edit</DropdownMenuItem>
                  <DropdownMenuItem className={touch}>Reassign</DropdownMenuItem>
                  <DropdownMenuItem
                    className={touch}
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
          className="flex flex-col items-start gap-3 rounded-lg border border-border p-4"
        >
          <p>No crew match your filter.</p>
          <Button
            variant="outline"
            className={touch}
            onClick={() => setQuery("")}
          >
            Clear filter
          </Button>
        </div>
      )}
    </main>
  );
}
