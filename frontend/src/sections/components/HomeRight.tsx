import type { BIOGRAPHY_QUERY_RESULT } from "../../sanity.types";

type HomeProps = {
  homeData: NonNullable<
    NonNullable<BIOGRAPHY_QUERY_RESULT>["homeRight"]
  >;
};

export const HomeRight = ({ homeData }: HomeProps) => {
  return (
    <div className="home__info">
      {homeData?.map((bio) => (
        <div key={bio?._key}>
          <h3 className="home__info-title">{bio?.title}</h3>
          <p className="home__info-number">{bio?.description}</p>
        </div>
      ))}
    </div>
  );
};
