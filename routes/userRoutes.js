const express = require("express");
const {
  register,
  login,
  deleteUser,
  logout,
  verifyToken,
  searchUser,
} = require("../controllers/userControllers");
const {
  checkUserEmail,
  setNewPassword,
  validateToken,
} = require("../controllers/dbControllers");
const { followUser, unfollowUser, isFollowed } = require('../controllers/socialControllers');

const { 
  deleteSharedPlaylistsContent, 
  getSharedPlaylists, 
  createNewSharedPlaylist, 
  addTrackToPlaylist, 
  getAllTracksFromPlaylist,
  deleteAllTracks
 } = require("../controllers/playlistControllers"); 

  // middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);
router.delete("/delete", deleteUser);
router.post("/logout", logout);
router.get("/verifyToken", verifyToken);
router.post("/reset-password", validInfo, checkUserEmail);
router.put("/reset-password", setNewPassword);
router.get("/reset-password/:token", validateToken);
router.post("/searchUser", searchUser);
router.post('/followUser', followUser);
router.delete('/unfollowUser', unfollowUser);
router.get('/isFollowed', isFollowed);

// shared playlist routes
router.post("/createNewSharedPlaylist", createNewSharedPlaylist);
router.get("/getSharedPlaylists", getSharedPlaylists)
router.post("/addTrackToPlaylist", addTrackToPlaylist);
router.get("/getAllTracksFromPlaylist", getAllTracksFromPlaylist)

// test endpoints, not used in code
router.delete("/deleteAllSharedPlaylists", deleteSharedPlaylistsContent);
router.delete("/deleteAllTracks", deleteAllTracks);

module.exports = router;
