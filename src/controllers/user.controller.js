import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler( async(req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images and check for avatar
    // upload image and avatar on cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response

    // 1. get user details from frontend
    const { username, email, fullName, password } = req.body;
    console.log("email: ", email);

    // 2. validation
    if ( [fullName, email, username, password].some((field) => field?.trim() == "") ) {
        throw new ApiError(400, "All field are required");
    };

    // 3. check if user already exists : username, email
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    });

    if(existedUser) {
        throw new ApiError(409, "User with email or usename already exists")
    };

} );

export { registerUser };