import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type CreateUserInput = {
    email: string;
    passwordHash: string;
    name?: string | null;
    locale?: string;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(input: CreateUserInput): Promise<User>;
    touchLastLogin(userId: string): Promise<void>;
}
export {};
