import azure.functions as func
import logging

from download_strava_data import retrieve_activities
from analyze_activities import analyze_activities

app = func.FunctionApp()

@app.timer_trigger(schedule="0 0 2 * * *", arg_name="myTimer", run_on_startup=False,
              use_monitor=False)
def daily_analysis(myTimer: func.TimerRequest) -> None:
    if myTimer.past_due:
        logging.warning("Timer is past due!")

    logging.info("Hello from daily_analysis!")

    try:
        retrieve_activities()
        analyze_activities()
    except:
        logging.error("Error occurred during daily analysis", exc_info=True)