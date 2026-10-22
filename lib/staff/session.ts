"use client";

import { useSyncExternalStore } from "react";
import type { AccessRole } from "@/lib/settings/appearance";
import {
  assignStaffRoles,
  createJobRole,
  removeJobRole,
  saveStaffMember,
  seedDirectory,
  type StaffDirectory,
  type StaffDraft,
} from "@/lib/staff/directory";

const storageKey = "mattel.staff.directory.v1";
const eventName = "mattel-staff-directory";

const serverDirectory = seedDirectory();
let snapshot: StaffDirectory = serverDirectory;
let hydrated = false;

function normalize(parsed: Partial<StaffDirectory>): StaffDirectory {
  const seed = seedDirectory();
  const roles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : seed.roles;
  const staff = Array.isArray(parsed.staff) ? parsed.staff : seed.staff;
  const known = new Set(roles.map((role) => role.id));
  const missingBuiltIns = seed.roles.filter((role) => !known.has(role.id));
  return {
    roles: [...roles, ...missingBuiltIns],
    staff,
  };
}

export function readStaffDirectory(): StaffDirectory {
  if (typeof window === "undefined") {
    return serverDirectory;
  }
  if (!hydrated) {
    hydrated = true;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        snapshot = normalize(JSON.parse(raw) as Partial<StaffDirectory>);
      } catch {
        snapshot = seedDirectory();
      }
    }
  }
  return snapshot;
}

function commit(next: StaffDirectory) {
  snapshot = next;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(eventName));
}

export function subscribeStaffDirectory(onStoreChange: () => void) {
  const notify = () => onStoreChange();
  window.addEventListener(eventName, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(eventName, notify);
    window.removeEventListener("storage", notify);
  };
}

export function useStaffDirectory() {
  return useSyncExternalStore(subscribeStaffDirectory, readStaffDirectory, () => serverDirectory);
}

export function saveStaff(draft: StaffDraft, id?: string) {
  const result = saveStaffMember(readStaffDirectory(), draft, id);
  if (result.ok) {
    commit(result.directory);
  }
  return result;
}

export function setStaffRoles(staffId: string, roleIds: string[], actor: AccessRole) {
  const result = assignStaffRoles(readStaffDirectory(), staffId, roleIds, actor);
  if (result.ok) {
    commit(result.directory);
  }
  return result;
}

export function addJobRole(name: string, actor: AccessRole) {
  const result = createJobRole(readStaffDirectory(), name, actor);
  if (result.ok) {
    commit(result.directory);
  }
  return result;
}

export function deleteJobRole(roleId: string, actor: AccessRole) {
  const result = removeJobRole(readStaffDirectory(), roleId, actor);
  if (result.ok) {
    commit(result.directory);
  }
  return result;
}
