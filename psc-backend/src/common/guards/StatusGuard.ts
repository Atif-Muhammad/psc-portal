import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MemberService } from 'src/member/member.service';

@Injectable()
export class StatusGuard implements CanActivate {
  constructor(private memberService: MemberService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, body } = request;

    // Prefer membership number coming from the frontend payload; fall back to JWT user id
    const membership_no = body.membership_no ?? user?.id;

    if (membership_no) {
      // check member status
      const member = await this.memberService.checkMemberStatus(membership_no);
      if (member?.Status === 'deactivated') {
        throw new HttpException(
          'Your account has been deactivated, so you cannot make bookings. please contact PSC.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return true;
  }
}
