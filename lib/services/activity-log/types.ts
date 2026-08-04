import { ActivityModules, ActivityStatuses } from "./activity-constants";

export type ActivityModule =
  (typeof ActivityModules)[keyof typeof ActivityModules];

export type ActivityStatus =
  (typeof ActivityStatuses)[keyof typeof ActivityStatuses];

export interface ActivityEntry {
  id: string;

  ownerModule: ActivityModule;

  visibleModules: ActivityModule[];

  activityType: string;

  documentType: string;

  documentNumber?: string;

  title: string;

  description?: string;

  createdAt: string;

  createdBy?: string;

  status: ActivityStatus;

  href?: string;
}