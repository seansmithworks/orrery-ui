"use client";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

/**
 * Holds the selected value. Horizontal only: the kit draws one row of tabs with the selected bar under it, so
 * Base UI's orientation is not offered.
 */
function Root({
  className,
  ...props
}: Omit<WithClass<BaseTabs.Root.Props>, "orientation">) {
  return (
    // Component class first: the kit baseline keys each element by its first orr- class. orr-control carries the
    // selected colours (control.css), shared with Checkbox and Switch.
    <BaseTabs.Root
      {...props}
      className={cx("orr-tabs", "orr-control", className)}
    />
  );
}

/** The row of tabs, with the selected bar drawn under the selected tab. Arrow keys, Home and End move between tabs. */
function List({
  className,
  children,
  ...props
}: WithClass<BaseTabs.List.Props>) {
  return (
    <BaseTabs.List {...props} className={cx("orr-tabs__list", className)}>
      {children}
      <BaseTabs.Indicator className="orr-tabs__indicator" />
    </BaseTabs.List>
  );
}

function Tab({ className, ...props }: WithClass<BaseTabs.Tab.Props>) {
  return <BaseTabs.Tab {...props} className={cx("orr-tabs__tab", className)} />;
}

function Panel({ className, ...props }: WithClass<BaseTabs.Panel.Props>) {
  return (
    <BaseTabs.Panel {...props} className={cx("orr-tabs__panel", className)} />
  );
}

/**
 * Tabs on Base UI: a row of tabs that each show one panel. Arrow keys move between tabs, Home and End jump to the
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
