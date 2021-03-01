import { CreateApplicationDto } from './dto/create-application.dto';
import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Application, ApplicationDocument } from './application.schema';
import { isValidObjectId, Model } from 'mongoose';
import { v4 as generateUUID } from 'uuid';
import { User, UserDocument } from '../user/user.schema';
import { LoggedInUser } from '../auth/interface/loggedInUser.interface';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger('application');

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel('User') private userModel: Model<UserDocument>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, authorizedUser: LoggedInUser): Promise<Application> {
    try {
      const clientSecret = generateUUID();
      const creationDate = new Date();

      const newApplication = new this.applicationModel({
        ...createApplicationDto,
        clientSecret,
        creationDate,
        admin: authorizedUser.id,
      });

      await newApplication.save();
      return newApplication;
    } catch (e) {
      this.logger.error(e);
      throw new ConflictException(e.message);
    }
  }

  async delete(id: string) {
    try {
      const AppUser = await this.applicationModel.findOne({ _id: id }).populate('participants', '_id');
      AppUser.participants.forEach(async (user) => {
        const User = await this.userModel.findById(user);
        User.authorizedApplications = User.authorizedApplications.filter((_id) => _id.toString() !== id);
        await User.save();
      });
      await this.applicationModel.findByIdAndDelete({ _id: id });
    } catch (e) {
      this.logger.error(e);
      throw new ConflictException(e.message);
    }
  }

  findAll() {
    return this.applicationModel.find();
  }

  async findUsersGrantedAccess(id: string) {
    const data = await this.applicationModel.findOne({ _id: id }).populate('participants', 'name collegeEmail');
    return data;
  }

  async findOneById(id: string) {
    if (isValidObjectId(id)) {
      const item = await this.applicationModel.findOne({ _id: id });
      return item;
    } else {
      throw new BadRequestException();
    }
  }

  /** to return details of applications created by user */
  async findAllByOwner(user: User): Promise<Array<Application>> {
    const item = await this.applicationModel.find({ admin: user });
    return item;
  }

  async findAllByParticipant(user: User): Promise<Array<Application>> {
    const item = await this.applicationModel.find({ participants: user });
    return item;
  }

  async pushUserIntoApplicationParticipantList(application: Application, user: User) {
    try {
      await this.applicationModel.findOneAndUpdate(
        { name: application.name },
        {
          $addToSet: { participants: user },
        },
      );
      this.logger.verbose(`Added ${user.name} to ${application.name}`);
    } catch (e) {
      this.logger.error(`Error adding ${user.name} to ${application.name}`);
    }
  }

  async findOneByIdAndSecret(id: string, secret: string): Promise<Application> {
    const result = await this.applicationModel.findOne({ _id: id, clientSecret: secret });
    if (result === null) {
      throw new UnauthorizedException('Application not found');
    }

    return result;
  }
}
