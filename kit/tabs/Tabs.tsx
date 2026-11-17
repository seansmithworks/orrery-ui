"use client";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from "react";
import {
  Tabs as SdkTabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@ui-sdk/react/tabs";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

// UI SDK sets activation on the root; the kit keeps it on the List as activateOnFocus, so the List reports it up.
const Activation = createContext<(activateOnFocus: boolean) => void>(() => {});

/**
 * Holds the selected value. Horizontal only: the kit draws one row of tabs with the selected bar under it, so
 * UI SDK's orientation is not offered. Activation is the List's activateOnFocus.
 */
function Root({
  className,
  ...props
}: Omit<
  WithClass<ComponentProps<typeof SdkTabs>>,
  "orientation" | "activation"
>) {
  const [activateOnFocus, setActivateOnFocus] = useState(false);
  return (
    <Activation.Provider value={setActivateOnFocus}>
      {/* Component class first: the kit baseline keys each element by its first orr- class. orr-control carries the
          selected colours (control.css), shared with Checkbox and Switch. */}
      <SdkTabs
        {...props}
        activation={activateOnFocus ? "automatic" : "manual"}
        className={cx("orr-tabs", "orr-control", className)}
      />
    </Activation.Provider>
  );
}

/** The row of tabs, with the selected bar drawn under the selected tab. Arrow keys, Home and End move between tabs. */
function List({
  className,
  children,
  activateOnFocus = false,
  ...props
}: Omit<WithClass<ComponentProps<typeof TabsList>>, "children"> &
  // children is a plain node: the kit appends the selected bar after it, so UI SDK's state-function children do
  // not apply.
  Pick<ComponentProps<"div">, "children"> & {
    /** Select a tab as the arrow keys reach it. Off: arrows move focus, Enter or Space selects. */
    activateOnFocus?: boolean;
  }) {
  const setActivateOnFocus = useContext(Activation);
  useLayoutEffect(() => {
    setActivateOnFocus(activateOnFocus);
  }, [activateOnFocus, setActivateOnFocus]);
  return (
    <TabsList {...props} className={cx("orr-tabs__list", className)}>
      {children}
      <TabsIndicator className="orr-tabs__indicator" />
    </TabsList>
  );
}

function Tab({
  className,
  ...props
}: WithClass<ComponentProps<typeof TabsTab>>) {
  return <TabsTab {...props} className={cx("orr-tabs__tab", className)} />;
}

function Panel({
  className,
  ...props
}: WithClass<ComponentProps<typeof TabsPanel>>) {
  return <TabsPanel {...props} className={cx("orr-tabs__panel", className)} />;
}

/**
 * Tabs on UI SDK: a row of tabs that each show one panel. Arrow keys move between tabs, Home and End jump to the
 * ends, Enter or Space selects. A disabled tab can take focus but not be selected. Styles: kit.css (.orr-tabs).
 *
 * ```tsx
 * <Tabs.Root defaultValue="overview">
 *   <Tabs.List aria-label="Orbit">
 *     <Tabs.Tab value="overview">Overview</Tabs.Tab>
 *     <Tabs.Tab value="moons">Moons</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="overview">...</Tabs.Panel>
 *   <Tabs.Panel value="moons">...</Tabs.Panel>
 * </Tabs.Root>
 * ```
 */
export const Tabs = { Root, List, Tab, Panel };
