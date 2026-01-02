import api from "./http";

export async function saveSprintProgress({
  projectId,
  words,
  minutes,
  date,
}) {
  return api.post("projects/progress/sprint", {
    projectId,
    words,
    minutes,
    date,
  });
}
