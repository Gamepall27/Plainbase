import { UserRepository } from "../db/repositories/user-repository.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  listUsers() {
    return this.userRepository.list();
  }
}
