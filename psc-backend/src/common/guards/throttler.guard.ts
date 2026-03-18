import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { THROTTLE_EMAIL_METADATA, ThrottleEmailOptions } from "../decorators/throttle-email.decorator";

@Injectable()
export class ThrottleGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.get<ThrottleEmailOptions>(
            THROTTLE_EMAIL_METADATA,
            context.getHandler(),
        );

        if (!options) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const body = request.body || {};
        const { email, memberID } = body;
        const path = request.url;

        // Use email from payload, or memberID from payload, or email from request.user (set by JwtAccGuard)
        const identifier = email || memberID || user?.email;

        if (!identifier) {
            return true;
        }

        const now = new Date();
        const ttlMillis = options.ttl * 1000;

        // 1. Check if identifier exists in ThrottleLog
        let throttleLog = await this.prisma.throttleLog.findFirst({
            where: { email: identifier }
        });

        if (!throttleLog) {
            await this.prisma.throttleLog.create({
                data: {
                    email: identifier,
                    attempts: 1,
                    failed: 0,
                    success: 0,
                    recentAttempt: [{ attemptAt: now.toISOString(), status: 'PENDING', path }]
                }
            });
            return true;
        }

        // 2. Filter expired attempts
        const recentAttempts = (throttleLog.recentAttempt as any[]) || [];
        
        // Clean up: Keep attempts if they are within a reasonable global window (e.g., 24h)
        // AND for the current path, they must be within the specified TTL for the limit check.
        const validAttempts = recentAttempts.filter(attempt => {
            const attemptDate = new Date(attempt.attemptAt);
            const ageMillis = now.getTime() - attemptDate.getTime();
            // Remove anything older than 24 hours globally to keep JSON size manageable
            return ageMillis < 24 * 60 * 60 * 1000;
        });

        // Specific count for current path and TTL
        const currentPathAttempts = validAttempts.filter(attempt => {
            const attemptDate = new Date(attempt.attemptAt);
            return attempt.path === path && (now.getTime() - attemptDate.getTime()) < ttlMillis;
        });

        // 3. Check limit
        if (currentPathAttempts.length >= options.limit) {
            throw new HttpException(
                `Too many attempts on ${path}. Please try again after ${options.ttl} seconds.`,
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        // 4. Update ThrottleLog: increment attempts and add current attempt
        const updatedRecentAttempts = [
            ...validAttempts,
            { attemptAt: now.toISOString(), status: 'PENDING', path }
        ];

        await this.prisma.throttleLog.update({
            where: { id: throttleLog.id },
            data: {
                attempts: throttleLog.attempts + 1,
                recentAttempt: updatedRecentAttempts,
                updatedAt: now
            }
        });

        return true;
    }

}
