
export class ScoreTimerManager {
    constructor(onTimeEnd, onScoreUpdate, initialTime = 60, targetScore = 100) {
        this.score = 0;
        this.timeLimit = initialTime;
        this.targetScore = targetScore;
        this.timer = null;
        this.onTimeEnd = onTimeEnd;
        this.onScoreUpdate = onScoreUpdate;
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeLimit--;
            this.onScoreUpdate(this.score, this.timeLimit);

            if (this.timeLimit <= 0) {
                this.endGame();
            }
        }, 1000)
    }

    endGame(won = false) {
        this.stopTimer();
        this.onTimeEnd(won);
    }

    stopTimer() {
        clearInterval(this.timer);
    }

    addPoints(points) {
        this.score += points;
        this.onScoreUpdate(this.score, this.timeLimit);

        if (this.score >= this.targetScore) {
            this.endGame(true)
        }
    }
}