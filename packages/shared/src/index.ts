export interface AuthUser {
  id: string;
  username: string;
  roleId: string;
  roleCode: string;
  permissions: string[];
  branchIds: string[];
  defaultBranchId?: string;
  language: string;
}

export * from './enums';
export * from './permissions';
export * from './schemas';
export * from './utils';