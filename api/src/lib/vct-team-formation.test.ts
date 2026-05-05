import { describe, expect, test } from "bun:test";

import {
  type VctFormationFilters,
  type VctInscricaoLike,
  getFormationDetailScore,
  pickBestCandidateForTeam,
  pickBestTeamForPlayer,
} from "./vct-team-formation";

function makePlayer(overrides: Partial<VctInscricaoLike>): VctInscricaoLike {
  return {
    _id: "",
    elo: "Ouro 2",
    time: null,
    diasTreino: "",
    diasSemana: "",
    horariosTreino: "",
    melhorJanela: "",
    compromisso: "",
    rotinaFixa: "",
    horariosDefinidos: "",
    capitao: "",
    presencial: "",
    deslocamento: "",
    ...overrides,
  };
}

describe("pickBestCandidateForTeam", () => {
  test("keeps only players that match the team's training day and confirmed travel filter", () => {
    const team = {
      members: [makePlayer({ diasTreino: "Segunda e Quarta" })],
      memberCount: 1,
      eloSum: 4,
      vacancies: 4,
    };

    const players = [
      makePlayer({
        _id: "1",
        diasTreino: "Segunda e Quarta",
        deslocamento: "Confirmado",
      }),
      makePlayer({
        _id: "2",
        diasTreino: "Terca e Quinta",
        deslocamento: "Confirmado",
      }),
      makePlayer({
        _id: "3",
        diasTreino: "Segunda e Quarta",
        deslocamento: "Pendente",
      }),
    ];

    const filters: VctFormationFilters = {
      sameTrainingDays: true,
      sameAvailability: false,
      confirmedTravelOnly: true,
      prioritizeCaptainIfMissing: false,
      singleCaptainPerTeam: false,
      maxEloPerTeam: null,
    };

    expect(pickBestCandidateForTeam(players, team, filters)?._id).toBe("1");
  });

  test("prefers a captain when the team does not have one", () => {
    const team = {
      members: [makePlayer({ diasTreino: "Segunda e Quarta", capitao: "Nao" })],
      memberCount: 1,
      eloSum: 4,
      vacancies: 4,
    };

    const players = [
      makePlayer({
        _id: "1",
        diasTreino: "Segunda e Quarta",
        capitao: "Sim",
      }),
      makePlayer({
        _id: "2",
        diasTreino: "Segunda e Quarta",
        capitao: "Nao",
      }),
    ];

    const filters: VctFormationFilters = {
      sameTrainingDays: true,
      sameAvailability: false,
      confirmedTravelOnly: false,
      prioritizeCaptainIfMissing: true,
      singleCaptainPerTeam: false,
      maxEloPerTeam: null,
    };

    expect(pickBestCandidateForTeam(players, team, filters)?._id).toBe("1");
  });

  test("respects the team elo cap", () => {
    const team = {
      members: [],
      memberCount: 0,
      eloSum: 0,
      vacancies: 5,
    };

    const players = [makePlayer({ _id: "1", elo: "Diamante" })];

    const filters: VctFormationFilters = {
      sameTrainingDays: false,
      sameAvailability: false,
      confirmedTravelOnly: false,
      prioritizeCaptainIfMissing: false,
      singleCaptainPerTeam: false,
      maxEloPerTeam: "Ouro",
    };

    expect(pickBestCandidateForTeam(players, team, filters)).toBeNull();
  });

  test("blocks a second captain when the team already has one", () => {
    const team = {
      members: [makePlayer({ capitao: "Sim" })],
      memberCount: 1,
      eloSum: 9,
      vacancies: 4,
    };

    const players = [
      makePlayer({ _id: "1", capitao: "Sim" }),
      makePlayer({ _id: "2", capitao: "Nao" }),
    ];

    const filters: VctFormationFilters = {
      sameTrainingDays: false,
      sameAvailability: false,
      confirmedTravelOnly: false,
      prioritizeCaptainIfMissing: false,
      singleCaptainPerTeam: true,
      maxEloPerTeam: null,
    };

    expect(pickBestCandidateForTeam(players, team, filters)?._id).toBe("2");
  });

  test("matches equivalent text with accents and punctuation differences", () => {
    const team = {
      members: [
        makePlayer({
          diasTreino: "Quarta-feira;Terça-feira;Quinta-feira;Sábado",
          diasSemana: "Quarta-feira;Terça-feira;Quinta-feira;Sábado",
        }),
      ],
      memberCount: 1,
      eloSum: 10,
      vacancies: 4,
    };

    const players = [
      makePlayer({
        _id: "1",
        diasTreino: "Quarta feira, Terca feira, Quinta feira, Sabado",
        diasSemana: "Quarta feira, Terca feira, Quinta feira, Sabado",
      }),
    ];

    const filters: VctFormationFilters = {
      sameTrainingDays: true,
      sameAvailability: true,
      confirmedTravelOnly: false,
      prioritizeCaptainIfMissing: false,
      singleCaptainPerTeam: false,
      maxEloPerTeam: null,
    };

    expect(pickBestCandidateForTeam(players, team, filters)?._id).toBe("1");
  });

  test("prefers the team whose current members already match the player's schedule", () => {
    const player = makePlayer({
      _id: "player",
      diasTreino: "Segunda e Quarta",
      diasSemana: "Segunda e Quarta",
      horariosTreino: "Manhã",
      melhorJanela: "Manhã",
      compromisso: "Quero treinar algumas vezes e competir bem",
      rotinaFixa: "Sim",
      horariosDefinidos: "Sim",
      presencial: "Sim",
    });

    const teamFilters: VctFormationFilters = {
      sameTrainingDays: true,
      sameAvailability: true,
      confirmedTravelOnly: false,
      prioritizeCaptainIfMissing: false,
      singleCaptainPerTeam: false,
      maxEloPerTeam: null,
    };

    const teams = [
      {
        numero: 1,
        members: [makePlayer({ diasTreino: "Segunda e Quarta", diasSemana: "Segunda e Quarta" })],
        memberCount: 1,
        eloSum: 4,
        vacancies: 4,
        filters: teamFilters,
      },
      {
        numero: 2,
        members: [makePlayer({ diasTreino: "Terca e Quinta", diasSemana: "Terca e Quinta" })],
        memberCount: 1,
        eloSum: 4,
        vacancies: 4,
        filters: teamFilters,
      },
    ];

    expect(pickBestTeamForPlayer(player, teams)?.numero).toBe(1);
  });

  test("scores richer profiles higher than empty ones", () => {
    expect(
      getFormationDetailScore(
        makePlayer({
          diasTreino: "Segunda e Quarta",
          diasSemana: "Segunda e Quarta",
          horariosTreino: "Manhã",
        }),
      ),
    ).toBeGreaterThan(getFormationDetailScore(makePlayer({})));
  });
});
