import UsersModel from '../models/users.schema.js';

class Users {
    post = async(user) => {
        try {
            const newUser = new UsersModel(user);
            const savedUser = await newUser.save();
            return savedUser;
        } catch (error) {
            throw error;
        }
    }

    getOne = async(email) => {
        try {
            const user = await UsersModel.findOne({ email });
            return user;
        } catch (error) {
            throw error;
        }
    }

    putPassword = async (email, newPasswordHashed) => {
        try {
          const user = await UsersModel.findOne({ email });
      
          user.password = newPasswordHashed;
          await user.save();
      
          return { message: 'Password updated successfully' };
        } catch (error) {
          throw error;
        }
    }

    putRole = async (email, newRole) => {
        try {
          const user = await UsersModel.findOne({ email });
      
          if (!user) {
            // ERROR VA AQUÍ
          }

          user.role = newRole;
          await user.save();
      
          return { message: 'Role updated successfully' };
        } catch (error) {
          throw error;
        }
    }
}

export default Users;