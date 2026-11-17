//Dark & Light mode constants
export const DARK_THEME_CLASS = "dark-theme";
export const ICON_THEME_CLASS = "ri-sun-line";

export const getInitialIsDark = () => {
  const selectedTheme = localStorage.getItem("selected-theme");
  return selectedTheme === "dark";
};
