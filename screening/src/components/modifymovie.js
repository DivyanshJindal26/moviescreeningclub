import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Chip,
  Input,
  getKeyValue,
} from "@nextui-org/react";
const SERVERIP = "http://14.139.34.10:8000";

const ModifyMovie = () => {
  const [movies, setMovies] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [addingMovie, setAddingMovie] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    // If userType is not volunteer or admin, redirect to home page
    if (
      !userType ||
      userType === "standard" ||
      userType === "ticketvolunteer"
    ) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    if (!userType || userType === "standard") {
      navigate("/home");
    }
  }, [navigate]);

  useEffect(() => {
    getMovies();
  }, []);

  const getMovies = async () => {
    try {
      const response = await axios.get(`${SERVERIP}/movie/movies`);
      setMovies(response.data);
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setEditedData({
      title: movie.title,
      poster: movie.poster,
      description: movie.description,
      releaseDate: movie.releaseDate,
      genre: movie.genre,
      trailer: movie.trailer,
      currentscreening: movie.currentscreening,
    });
  };

  const handleSave = async () => {
    try {
      await axios.put(
        `${SERVERIP}/movie/movies/${editingMovie._id}`,
        editedData
      );
      setMovies((prevMovies) =>
        prevMovies.map((movie) =>
          movie._id === editingMovie._id ? editedData : movie
        )
      );
      setEditingMovie(null);
      setEditedData({});
    } catch (error) {
      console.error("Error updating movie:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setEditedData({
      ...editedData,
      [name]: newValue,
    });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${SERVERIP}/movie/movies/${id}`);
      setMovies((prevMovies) => prevMovies.filter((movie) => movie._id !== id));
    } catch (error) {
      console.error("Error deleting movie:", error);
    }
  };

  const handleAdd = () => {
    setAddingMovie(true);
  };

  const handleAddSave = async () => {
    try {
      const res = await axios.post(`${SERVERIP}/movie/add-movies`, editedData);
      console.log("Movie added:", res.data);
      setMovies([...movies, res.data]);
      setAddingMovie(false);
      setEditedData({});
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  const columns = [
    "title",
    "poster",
    "description",
    "release Date",
    "genre",
    "trailer",
    "current Screening",
    "actions",
  ];

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#e5e8f0]">
      <div className="w-[90%] flex flex-col bg-white h-[90%] my-4 rounded-xl shadow-lg items-center">
        <h1 className="text-3xl font-bold my-4">Movie List</h1>
        <div class="flex flex-col w-[90%]">
          <div class="-m-1.5 overflow-x-auto">
            <div class="p-1.5 min-w-full inline-block align-middle">
              <div class="overflow-hidden flex justify-center">
                <table className="w-[90%] divide-y divide-gray-200 dark:divide-neutral-700 my-3">
                  <thead className="capitalize bg-[#f4f4f5]">
                    <tr className="text-lg">
                      {columns.map((column) => (
                        <th
                          scope="col"
                          className="px-6 py-3 text-start text-sm font-medium text-gray-500 uppercase dark:text-neutral-500"
                          key={column}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((movie) => (
                      <tr
                        key={movie._id}
                        className="odd:bg-white even:bg-[#f4f4f5] dark:odd:bg-neutral-900 dark:even:bg-neutral-800"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">
                          {editingMovie === movie ? (
                            <input
                              type="text"
                              name="title"
                              value={editedData.title}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            movie.title
                          )}
                        </td>
                        <td className=" px-4 py-2">
                          {editingMovie === movie ? (
                            <input
                              type="text"
                              name="poster"
                              value={editedData.poster}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="poster-image"
                            />
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <textarea
                              name="description"
                              value={editedData.description}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            movie.description
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <input
                              type="date"
                              name="releaseDate"
                              value={editedData.releaseDate}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            new Date(movie.releaseDate).toLocaleDateString()
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <input
                              type="text"
                              name="genre"
                              value={editedData.genre}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            movie.genre
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <textarea
                              name="trailer"
                              value={editedData.trailer}
                              onChange={handleChange}
                              className="w-full"
                            />
                          ) : (
                            movie.trailer
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <input
                              type="checkbox"
                              name="currentscreening"
                              checked={editedData.currentscreening}
                              onChange={handleChange}
                            />
                          ) : movie.currentscreening ? (
                            "Yes"
                          ) : (
                            "No"
                          )}
                        </td>
                        <td className="  px-4 py-2">
                          {editingMovie === movie ? (
                            <div className="flex gap-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="green"
                                className="w-8 h-8"
                                onClick={handleSave}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                              </svg>

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="red"
                                className="w-8 h-8"
                                onClick={() => setEditingMovie(null)}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="green"
                                className="w-8 h-8"
                                onClick={() => handleEdit(movie)}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                />
                              </svg>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="red"
                                className="w-8 h-8"
                                onClick={() => handleDelete(movie._id)}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                              </svg>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModifyMovie;
