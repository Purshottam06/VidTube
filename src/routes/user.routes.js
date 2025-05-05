import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js"; 
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { 
    registerUser,
    getUserById,
    getAllUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    updateCurrentUser,
    updateCurrentUserPassword,
    updateCurrentUserAvatar,
    updateCurrentUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controller.js";

const router=Router(); 

router.route('/register').post(
    upload.fields([
        {
            name:'avatar',
            maxCount:1
        },
        {
            name:'coverImage',
            maxCount:1
        }
    ]),
    registerUser);

router.route('/login').post(loginUser);
router.route('/refres-access-token').get(refreshAccessToken);
// secure route
router.route('/:_id').get(verifyJWT,getUserById);
router.route('/').get(verifyJWT,getAllUser);
router.route('/logout').post(verifyJWT,logoutUser);
router.route('/update-user').patch(verifyJWT,updateCurrentUser);
router.route('/update-user-password').patch(verifyJWT,updateCurrentUserPassword);
router.route('/update-user-avatar').patch(verifyJWT,
    upload.single('avatar'),
    updateCurrentUserAvatar);
router.route('/update-user-coverImage').patch(verifyJWT,
    upload.single('coverImage'),
    updateCurrentUserCoverImage
    );
router.route('/channel-profile/:username').get(verifyJWT,getUserChannelProfile);

router.route('/watch-history').get(verifyJWT,getWatchHistory);

export default router;