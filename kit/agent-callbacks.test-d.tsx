// Typecheck-only (npm run typecheck): the callback and focus shapes coding agents wrote in eval lane 2
// (eval/results/lane-2/superseded/orrery-v1/, onboarding and crew-roster) must compile against the kit.
// Each block copies an agent's code; a failure here is a kit type an agent will trip on.
import { useRef, useState, type ReactElement } from "react";
import { Checkbox, Menu, Radio } from "./index";

export function PlainSetters(): ReactElement {
  const [team, setTeam] = useState("Solo");
  const [agreed, setAgreed] = useState(false);
  return (
    <>
      {/* onboarding__orrery__1: a useState setter on each. */}
      <Radio.Group name="team" value={team} onValueChange={setTeam}>
        <Radio.Item value="Solo">Solo</Radio.Item>
      </Radio.Group>
      <Checkbox name="terms" checked={agreed} onCheckedChange={setAgreed} />
    </>
  );
}

export function TypedArrows(): ReactElement {
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState(false);
  const [agreed, setAgreed] = useState(false);
  return (
    <>
      {/* onboarding__orrery__2: a one-argument arrow, typed with the value it expects. */}
      <Radio.Group
        name="team"
        required
        value={team}
        onValueChange={(v: string) => {
          setTeam(v);
          setTeamError(false);
        }}
      >
        <Radio.Item value="Solo">Solo{teamError ? "!" : ""}</Radio.Item>
      </Radio.Group>
      {/* onboarding__orrery__2 and __3. */}
      <Checkbox
        name="terms"
        checked={agreed}
        onCheckedChange={(c: boolean) => setAgreed(c)}
      />
    </>
  );
}

export function DetailsStillAvailable(): ReactElement {
  return (
    <>
      <Radio.Group
        onValueChange={(value, details) => void [value, details.reason]}
      >
        <Radio.Item value="a">A</Radio.Item>
      </Radio.Group>
      <Checkbox
        onCheckedChange={(checked, details) => void [checked, details.reason]}
      />
    </>
  );
}

export function MenuRefFocus(): ReactElement {
  // crew-roster__orrery__1: a ref, as Dialog.Popup takes.
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        Crew
      </h2>
      <Menu.Root>
        <Menu.Trigger aria-label="Actions for Ada Okafor">More</Menu.Trigger>
        <Menu.Popup align="end" finalFocus={heading}>
          <Menu.Item value="edit">Edit</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      {/* What it took before stays valid. */}
      <Menu.Root>
        <Menu.Trigger>More</Menu.Trigger>
        <Menu.Popup finalFocus={() => heading.current}>
          <Menu.Item value="edit">Edit</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <Menu.Root>
        <Menu.Trigger>More</Menu.Trigger>
        <Menu.Popup finalFocus="none">
          <Menu.Item value="edit">Edit</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
    </>
  );
}
