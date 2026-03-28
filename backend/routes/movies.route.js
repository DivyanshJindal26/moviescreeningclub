const express = require('express')
const {
  addMovie,
  getMovies,
  updateMovie,
  deleteMovie,
  getMovieById,
  getMovieByShowTime,
  addMovieShowtimes,
  deleteMovieShowtimes
} = require('@/controllers/movies.controller')
const { verifyJWTWithRole } = require('@/middleware')

const router = express.Router()

router.get('/', getMovies)
router.get('/:movieId', verifyJWTWithRole('standard'), getMovieById)
router.get(
  '/show/:showtimeId',
  verifyJWTWithRole('standard'),
  getMovieByShowTime
)
router.post('/add', verifyJWTWithRole(['movievolunteer','admin']), addMovie)
router.put('/:id', verifyJWTWithRole(['movievolunteer','admin']), updateMovie)
router.delete('/:id', verifyJWTWithRole(['movievolunteer','admin']), deleteMovie)
router.post(
  '/:movieId/showtimes',
  verifyJWTWithRole(['movievolunteer','admin']),
  addMovieShowtimes
)
router.delete(
  '/:movieId/:showtimeId',
  verifyJWTWithRole(['movievolunteer' , 'admin']),
  deleteMovieShowtimes
)

module.exports = router
