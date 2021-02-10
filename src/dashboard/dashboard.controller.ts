import { Controller, Get, Logger, Res, UseGuards, Request, Inject } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { UserService } from 'src/user/user.service';
import { AuthorizedUser } from 'src/user/interface/user.interface';
import { LoggedInUser } from 'src/auth/interface/loggedInUser.interface';
import { SCOPE } from 'src/account/minions/scopeMapper.minion';
import { ApplicationModule } from 'src/application/application.module';
import { ApplicationService } from 'src/application/application.service';

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger('dashboard');

  /** initialize dashboard module */
  constructor(
    private readonly dashboardService: DashboardService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(ApplicationService) private readonly applicationService: ApplicationService,
  ) {
    this.logger.verbose('dashboard initialized');
  }

  /**
   * Render Landing Page
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async showDashboard(@Request() req, @Res() res: Response) {
    const loggedInUser: LoggedInUser = req.user;
    const user = await this.userService.findOneById(loggedInUser.id);
    return res.render('dashboard/dashboard.hbs', { user });
  }

  /**
   * To load user dashboard
   */
  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  async showProfile(@Request() req, @Res() res: Response) {
    const loggedInUser: LoggedInUser = req.user;
    const user = await this.userService.findOneById(loggedInUser.id);
    return res.render('dashboard/profile.hbs', { user });
  }

  /**
   * To load data tab
   */
  @Get('/data')
  @UseGuards(JwtAuthGuard)
  async showData(@Request() req, @Res() res: Response) {
    const loggedInUser: LoggedInUser = req.user;
    const user = await this.userService.findOneById(loggedInUser.id);
    const applications = await this.applicationService.findAllByParticipant(user);
    return res.render('dashboard/data.hbs', { user, 
      app: {
      scope: SCOPE,
      items: applications,
    }, });
  }

  /**
   * To load dev tab
   */
  @Get('/dev')
  @UseGuards(JwtAuthGuard)
  async showDev(@Request() req, @Res() res: Response) {
    const loggedInUser: LoggedInUser = req.user;
    const user = await this.userService.findOneById(loggedInUser.id);
    const applications = await this.applicationService.findAllByOwner(user);

    return res.render('dashboard/dev.hbs', {
      user,
      app: {
        scope: SCOPE,
        items: applications,
      },
    });
  }
}
