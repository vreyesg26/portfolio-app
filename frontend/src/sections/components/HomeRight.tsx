import type { HomeTypes } from "../../types/types";

export const HomeRight = ({ homeData }: HomeTypes) => {
  return (
    <div className="home__info">
      {homeData?.map((bio) => (
        <div key={bio?.id}>
          <h3 className="home__info-title">{bio?.title}</h3>
          <p className="home__info-number">{bio?.description}</p>
        </div>
      ))}
    </div>
  );
};
