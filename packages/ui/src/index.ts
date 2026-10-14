// Nightprint UI, organised by atomic design (Brad Frost):
// atoms → molecules → organisms → templates. Pages live in apps/web.
// No package here knows the engine: organisms take plain view data.

export { Arrowhead, type ArrowheadProps } from "./atoms/arrowhead";
export { Balloon, type BalloonProps } from "./atoms/balloon";
export { Button, type ButtonProps } from "./atoms/button";
export { ButtonLink, type ButtonLinkProps } from "./atoms/button-link";
export { ChevronIcon, type ChevronIconProps } from "./atoms/chevron-icon";
export { FilterChip, type FilterChipProps } from "./atoms/filter-chip";
export { FlowDot, type FlowDotProps } from "./atoms/flow-dot";
export { FlowTag, type FlowTagProps } from "./atoms/flow-tag";
export { IconButton, type IconButtonProps } from "./atoms/icon-button";
export { LogoMark, type LogoMarkProps } from "./atoms/logo-mark";
export { MonoLabel, type MonoLabelProps } from "./atoms/mono-label";
export { NavLink, type NavLinkProps } from "./atoms/nav-link";
export { StepDot, type StepDotProps } from "./atoms/step-dot";
export { TextField, type TextFieldProps } from "./atoms/text-field";
export { Toggle, type ToggleProps } from "./atoms/toggle";
export { TokenTag, type TokenTagProps } from "./atoms/token-tag";

export { Breadcrumb, type BreadcrumbItem } from "./molecules/breadcrumb";
export { DimensionLabel, type DimensionLabelProps } from "./molecules/dimension-label";
export { FilterChips, type FilterChipsProps, type FilterOption } from "./molecules/filter-chips";
export { FlowLegend, type FlowLegendProps } from "./molecules/flow-legend";
export { LogLine, type LogLineProps } from "./molecules/log-line";
export { MachineCard, type MachineCardProps } from "./molecules/machine-card";
export { PartCallout, type PartCalloutProps } from "./molecules/part-callout";
export { PartRow, type PartRowProps } from "./molecules/part-row";
export {
  type PlanBalloon,
  type PlanBox,
  type PlanDimension,
  type PlanPart,
  type PlanRoute,
  type PlanTitleBlock,
  PlanView,
  type PlanViewProps,
  type PlanZone,
} from "./molecules/plan-view";
export { RepoForm, type RepoFormProps } from "./molecules/repo-form";
export { ScenarioEnd, type ScenarioEndProps } from "./molecules/scenario-end";
export { SectionHeading, type SectionHeadingProps } from "./molecules/section-heading";
export { SheetPreview, type SheetPreviewProps } from "./molecules/sheet-preview";
export { StageAction, type StageActionProps } from "./molecules/stage-action";
export { StepCaption, type StepCaptionProps } from "./molecules/step-caption";
export { type StepDotItem, StepDots, type StepDotsProps } from "./molecules/step-dots";
export { StepRuler, type StepRulerProps } from "./molecules/step-ruler";
export { TermEntry, type TermEntryProps } from "./molecules/term-entry";
export { WhatIfSwitch, type WhatIfSwitchProps } from "./molecules/what-if-switch";
export { Wordmark, type WordmarkProps } from "./molecules/wordmark";
export { ZoneLabel, type ZoneLabelProps } from "./molecules/zone-label";

export {
  BillOfParts,
  type BillOfPartsItem,
  type BillOfPartsProps,
} from "./organisms/bill-of-parts";
export { BuildLog, type BuildLogEntry, type BuildLogProps } from "./organisms/build-log";
export { Cartouche, type CartoucheProps } from "./organisms/cartouche";
export { CodeListing, type CodeListingProps } from "./organisms/code-listing";
export { ConceptArticle, type ConceptArticleProps } from "./organisms/concept-article";
export {
  DrawingLegend,
  type DrawingLegendProps,
  type LegendCallout,
} from "./organisms/drawing-legend";
export {
  DrawingRegister,
  type DrawingRegisterProps,
  type RegisterRow,
} from "./organisms/drawing-register";
export { DrawingSheet, type DrawingSheetProps } from "./organisms/drawing-sheet";
export { EventLog, type EventLogEntry, type EventLogProps } from "./organisms/event-log";
export { HomeHeader, type HomeHeaderProps } from "./organisms/home-header";
export { HomeIntro, type HomeIntroProps } from "./organisms/home-intro";
export { ImportPanel, type ImportPanelProps, type ImportStage } from "./organisms/import-panel";
export {
  type RunScenario,
  type RunStep,
  type RunStepVariant,
  RunTranscript,
  type RunTranscriptProps,
} from "./organisms/run-transcript";
export { ScenarioPicker, type ScenarioPickerProps } from "./organisms/scenario-picker";
export { type SeriesSheet, SiteFooter, type SiteFooterProps } from "./organisms/site-footer";
export { SiteHeader, type SiteHeaderProps } from "./organisms/site-header";
export { StoryNote, type StoryNoteProps } from "./organisms/story-note";
export { Transport, type TransportProps } from "./organisms/transport";
export { UpNext, type UpNextProps } from "./organisms/up-next";
export { type WhatIfItem, WhatIfPanel, type WhatIfPanelProps } from "./organisms/what-if-panel";

export { HomeTemplate, type HomeTemplateProps } from "./templates/home-template";
export { MachineTemplate, type MachineTemplateProps } from "./templates/machine-template";
export { PageSection, type PageSectionProps } from "./templates/page-section";
export { type StoryBeat, StoryTemplate, type StoryTemplateProps } from "./templates/story-template";
