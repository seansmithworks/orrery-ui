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

export default function CrewRoster() {
  const [crew, setCrew] = useState(INITIAL);
  const [filter, setFilter] = useState("");

  const q = filter.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Crew</h1>

        <div className="space-y-2">
          <Label htmlFor="crew-filter">Filter crew</Label>
          <Input
            id="crew-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {visible.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border bg-card text-card-foreground">
            {visible.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
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
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Reassign</DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
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
            className="rounded-md border border-border bg-card p-6 text-center space-y-3"
          >
            <p className="text-muted-foreground">No crew match your filter.</p>
            <Button variant="outline" onClick={() => setFilter("")}>
              Clear filter
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
