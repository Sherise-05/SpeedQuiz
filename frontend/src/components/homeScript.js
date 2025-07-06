import React, { useState, useEffect } from "react";
import logo from "../Noom.png";
import PropTypes from "prop-types";
import "../tailwind.css";
import "../App.css";
import { BACKEND_URL } from "../constants.js";

function homeScript() {
  const [error, setError] = useState(null);
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setError(queryParams.get("error"));
  });

  return (
    <div className="App">
      {/* Set the screen background to a dark blue and make it fullscreen. */}
      <div className="bg-[#0080ff] flex flex-col min-h-screen">
        <MakeGameTitle />

        <h3
          className={`font-bold text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl pb-12 -m-9 ${
            error == "wrongCode" ? "text-red-500" : "text-slate-300"
          }`}
        >
          {error == "wrongCode"
            ? "There was an error with the code you provided, please try again"
            : "Answer Fast. Drive Faster"}
        </h3>

        {/* Creates a POST form which takes the input of the textbox
        and sends it over to the node.js server running at 3001. */}
        <form action={`${BACKEND_URL}/join`} method="POST">
          {/* TextField function with parameter of 5 digits and large style. */}
          <TextField
            styleChoice={2}
            id="gameCode"
            name="gameCode"
            maxLength="4"
            pattern="^\d{4}$"
            placeHolder="Enter Code"
          />
          <TextField
            styleChoice={3}
            id="username"
            name="username"
            maxLength=""
            pattern="^\w+$"
            placeHolder="Your User Name"
          />
          <br></br>

          {/* Submit button of large size. */}
          <Button text="Join Game" styleChoice={0} size={3} type="submit" />
        </form>

        {/* Form for creating a lobby. */}
        <form action={`${BACKEND_URL}/create_lobby`}>
          {/* Button which sends that form. */}
          <Button text="Create Lobby" styleChoice={1} size={2} type="submit" />
        </form>
      </div>
    </div>
  );
}

/**
 * Button creates a desired standardized button element.
 *
 * Input
 * @param {string} text Text that will be inside the <button> element.
 * @param {integer} styleChoice Choice out of a few styles for the button.
 * @param {integer} size Choice out of a few sizes for the button.
 * @param {string} type Sets the type attribute of the <button> element (i.e. submit).
 *
 * Output
 * @returns A button html element with the desired parameters.
 */
function Button({ text, styleChoice, size, type }) {
  {
    /* Styles for the button
    This needs to be expanded / designed better. */
  }
  const buttonStyles = {
    1: "absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-purple-800 hover:bg-purple-900 text-slate-300",
    2: "bg-gray-500 hover:bg-gray-700 text-black",
    default: "bg-orange-400 hover:bg-orange-500 text-white",
  };

  {
    /* Interactive sizes for the buttons, scale with user screen,
    proportions need to be discussed / adjusted. */
  }
  const sizeStyles = {
    1: "font-bold rounded px-2 py-1",
    2: "font-bold rounded px-1 py-1 text-sm sm:px-2 sm:py-2 sm:text-5sm md:px-2 md:py-2 md:text-5sm lg:px-3 lg:py-3 lg:text-7sm xl:px-4 xl:py-4 xl:text-xl",
    3: "font-bold rounded px-2 py-2 text-lg sm:px-2 sm:py-2 sm:text-xl md:px-5 md:py-3 md:text-2xl lg:px-7 lg:py-5 lg:text-3xl xl:px-7 xl:py-5 xl:text-3xl",
    default: "font-bold rounded px-2 py-1",
  };

  {
    /* Sets the chosen class and style, or defaults to the default style. */
  }
  const buttonClass = buttonStyles[styleChoice] || buttonStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.default;

  {
    /* Returns the desired button element. */
  }
  return (
    <div className="Button">
      <button type={type} className={`${buttonClass} ${sizeClass}`}>
        <a>{text}</a>
      </button>
    </div>
  );
}
{
  /* Button prop validation */
}
Button.propTypes = {
  text: PropTypes.string.isRequired,
  styleChoice: PropTypes.number,
  size: PropTypes.number,
  type: PropTypes.string,
};
Button.defaultProps = {
  styleChoice: 1,
  size: 1,
  type: "button",
};

/**
 * MakeGameTitle renders the Noom title.
 *
 * Output
 * @returns An <img>, with the logo of Noom with width half of user screen width.
 */
function MakeGameTitle() {
  {
    /* Returns Noom title */
  }
  return (
    <div className="GameTitle py-10">
      <img
        className="w-1/2 mx-auto pt-4 pb-0 rounded"
        src={logo}
        alt="Noom Game Logo"
      />
    </div>
  );
}

/**
 * TextField creates a desired standardized text-field input.
 *
 * Inputs
 * @param {integer} styleChoice Choice of selections for the style of the box.
 * @param {string} id Sets the id attribute of the <input> element.
 * @param {string} name Sets the name attribute of the <input> element.
 * @param {string} maxLength Sets the maximum length of the <input> element.
 * @param {string} pattern Sets the pattern attribute of the <input> element.
 * @param {string} placeHolder Sets the placeHolder attribute of the <input> element.
 *
 * Output
 * @returns A textfield html element with the desired parameters.
 */
function TextField({ styleChoice, id, name, maxLength, pattern, placeHolder }) {
  {
    /* Interactive sizes and styles for the text-boxes,
    scale with user screen, proportions need to be
    discussed / adjusted. */
  }
  const textStyles = {
    1: "mt-1 block w-2/12 h-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center",
    2: " h-50 p-4 border bg-slate-300 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none sm:text-3xl sm:w-6/12 md:text-5xl md:w-5/12 lg:text-7xl lg:w-5/12 xl:text-9xl xl:w-4/12 placeholder:sm:text-xl placeholder:md:text-3xl placeholder:lg:text-5xl placeholder:xl:text-6xl text-center",
    3: " h-20 p-2 m-5 border bg-slate-300 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none sm:text-xl sm:w-3/12 md:text-2xl md:w-5/24 lg:text-4xl lg:w-5/24 xl:text-5xl xl:w-4/24 placeholder:sm:text-lg placeholder:md:text-xl placeholder:lg:text-2xl placeholder:xl:text-3xl text-center",
    default:
      "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
  };

  {
    /* Sets the text-class to the chosen style.
    If no choice / out of bounds, then default style. */
  }
  const textClass = textStyles[styleChoice] || textStyles.default;

  {
    /* Returns the desired text input field. */
  }
  return (
    <div className="TextField">
      <input
        placeholder={placeHolder}
        maxLength={maxLength}
        className={textClass}
        type="text"
        id={id}
        name={name}
        pattern={pattern}
        required
      />
    </div>
  );
}
{
  /* TextField prop validation */
}
TextField.propTypes = {
  styleChoice: PropTypes.number,
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  maxLength: PropTypes.string,
  pattern: PropTypes.string,
  placeHolder: PropTypes.string,
};
TextField.defaultProps = {
  styleChoice: 1,
  name: "",
  maxLength: "",
  pattern: "",
  placeHolder: "Text Input",
};

export default homeScript;
