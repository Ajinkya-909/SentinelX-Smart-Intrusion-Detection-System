/**
 * User Repository
 * Handles all database operations for User table
 */

import { prisma } from "@/config/db";
import type { CreateUserInput, UpdateUserInput } from "@/types/db.types";

export const userRepository = {
  /**
   * @param data - { email, password_hash, first_name?, last_name? }
   * @returns Created user object with id, created_at, updated_at
   */
  async create(data: CreateUserInput) {
    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: data.password_hash,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
      },
    });
    return user;
  },

  /**
   * @param email - User email (unique)
   * @returns User object or null
   */
  async findByEmail(email: string) {
    const user = await prisma.users.findUnique({
      where: { email },
    });
    return user;
  },

  /**
   * @param email - User email
   * @returns Full user object with password_hash (auth service only)
   */
  async findByEmailForAuth(email: string) {
    const user = await prisma.users.findUnique({
      where: { email },
    });
    return user;
  },

  /**
   * @param id - User UUID
   * @returns User object or null
   */
  async findById(id: string) {
    const user = await prisma.users.findUnique({
      where: { id },
    });
    return user;
  },

  /**
   * @param id - User UUID
   * @param data - { email?, password_hash?, first_name?, last_name? }
   * @returns Updated user object
   */
  async update(id: string, data: UpdateUserInput) {
    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password_hash !== undefined)
      updateData.password_hash = data.password_hash;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;

    const user = await prisma.users.update({
      where: { id },
      data: updateData,
    });
    return user;
  },

  /**
   * @param id - User UUID
   * @returns Deleted user object
   */
  async delete(id: string) {
    const user = await prisma.users.delete({
      where: { id },
    });
    return user;
  },
};
