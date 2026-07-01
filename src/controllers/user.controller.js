import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // STEP 1 - Get user data from frontend
    const { fullName, email, username, password } = req.body;

    // STEP 2 - Validation on each field (not empty)
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // STEP 3 - Check if user already exists (username / email)
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // STEP 4 - Check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // STEP 5 - Upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
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
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Step 9 - Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    // STEP 1 - Get data from request body
    const { email, username, password } = req.body;

    // STEP 2 - Give access via email or username
    if (! (username || email)) {
        throw new ApiError(400, "username or email is required");
    }

    // STEP 3 - Find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // STEP 4 - Password check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // STEP 5 - Access and Refresh token generation
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // STEP 6 - Fetch the user without sensitive fields
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // STEP 7 - Send cookies in secure way
    const options = {
        httpOnly: true,
        secure: true
    };

    // STEP 8 - Return response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // STEP 1 - Remove refresh token from DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true }
    )

    // STEP 2 — clear both cookies
    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully")
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // STEP 1 — Get the incoming refresh token from cookie or body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    // STEP 2 — Verify the token is valid
    const decodeToken = jwt.verify( incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET );

    // STEP 3 — Find the user from the decoded token
    const user = await user.findById(decodeToken?._id);
    
    if(!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // STEP 4 — Compare incoming token with the one stored in DB
    if(incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is used or expired");
    }

    // STEP 5 — Issue new token pair
    const { accessToken, newRefreshToken } = await generateTokens(user._id);

    // STEP 6 — Set new cookies and return
    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
        new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken },
            "Access token refreshed successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};