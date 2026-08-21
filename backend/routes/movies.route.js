const express = require('express')
const {
  addMovie,
  getMovies,
  updateMovie,
  deleteMovie,
  getMovieById,
  getMovieByShowTime,
  addMovieShowtimes,
  updateMovieShowtime,
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
router.post('/add', verifyJWTWithRole('movievolunteer'), addMovie)
router.post('/:id', verifyJWTWithRole('movievolunteer'), updateMovie)
router.post('/delete/:id', verifyJWTWithRole('movievolunteer'), deleteMovie)
router.post(
  '/:movieId/showtimes',
  verifyJWTWithRole('movievolunteer'),
  addMovieShowtimes
)
router.post(
  '/:movieId/showtimes/:showtimeId',
  verifyJWTWithRole('movievolunteer'),
  updateMovieShowtime
)
router.post(
  '/delete/:movieId/:showtimeId',
  verifyJWTWithRole('movievolunteer'),
  deleteMovieShowtimes
)

module.exports = router
