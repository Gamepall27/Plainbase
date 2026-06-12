import { RoleRepository } from "../db/repositories/role-repository.js";

export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  listRoles() {
    return this.roleRepository.list();
  }
}
