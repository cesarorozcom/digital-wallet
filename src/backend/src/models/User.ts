export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

