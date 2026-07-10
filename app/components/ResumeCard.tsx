import { Link } from "react-router";

type ResumeCardProps = {
  resume: {
    id: number | string;
    jobTitle: string;
  };
};

const ResumeCard = ({ resume }: ResumeCardProps): React.JSX.Element => {
  return (
    <Link to={`/resume/${resume.id}`}>ResumeCard</Link>
  );
};

export default ResumeCard;