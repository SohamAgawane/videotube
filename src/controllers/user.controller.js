import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // STEP 1 - Get user data from frontend
    const {fullName, email, username, password } = req.body;
    
    // STEP 2 - Validation on each field (not empty)
    if( [fullName, email, username, password].some((field) => field?.trim() === "") ) {
        throw new ApiError(400, "All fields are required");
    }

    // STEP 3 - Check if user already exists (username / email)
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // STEP 4 - Check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // STEP 5 - Upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // STEP 6 - Create user object & create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // STEP 7 - Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        // writing all which you do not want select
        // Use minus/dash (-) sign infornt of the field
        "-password -refreshToken"
    )

    // STEP 8 - Check for user creation
    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Step 9 - Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    // STEP 1 - Get data from request body
    // STEP 2 - Give access via email or username
    // STEP 3 - Find the user
    // STEP 4 - Password check
    // STEP 5 - Access and Refresh token generation
})

export { registerUser };