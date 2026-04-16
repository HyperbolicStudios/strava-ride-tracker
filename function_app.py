import azure.functions as func
import logging

app = func.FunctionApp()

@app.timer_trigger(schedule="0 0 6 * * *", arg_name="myTimer", run_on_startup=False,
              use_monitor=False)
def daily_analysis(myTimer: func.TimerRequest) -> None:
    if myTimer.past_due:
        logging.warning("Timer is past due!")

    logging.info("Hello from daily_analysis!")