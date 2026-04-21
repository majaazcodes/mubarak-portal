import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository, type UserWithAgencyStatus } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findByEmail(email: string): Promise<UserWithAgencyStatus | null> {
    return this.repo.findByEmailLower(email);
  }

  async findById(id: string): Promise<UserWithAgencyStatus | null> {
    return this.repo.findById(id);
  }

  async requireById(id: string): Promise<UserWithAgencyStatus> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async markLogin(id: string): Promise<void> {
    await this.repo.updateLastLogin(id);
  }
}
