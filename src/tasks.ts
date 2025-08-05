import { createSpinner } from 'nanospinner';
import {setTimeout} from "timers/promises";
import PQueue from "p-queue";

type TaskOptions = {
   title: string;
}

export function wrapTask<Params, ReturnType> (
    taskFn: (args: Params) => Promise<ReturnType>,
    { title }: TaskOptions
): (args: Params) => Promise<ReturnType> {
    return async (args: Params): Promise<ReturnType> => {
        const spinner = createSpinner(title).start()
        let result: ReturnType;
        try {
            result = await taskFn(args);
        }
        catch (err) {
            spinner.error();
            throw err;
        }
        spinner.success();
        return result;
    }
}

type ParallelTaskOptions = {
   title: string;
   concurrency: number;
   throttleMs: number;
}

export async function wrapParallelTasks(
    taskFns: (() => Promise<void | Error>)[],
    { title, concurrency, throttleMs }: ParallelTaskOptions): Promise<void | Error[]> {

    let done = 0;
    const workQueue = new PQueue({ concurrency });
    const spinner = createSpinner(`${title} (${done}/${taskFns.length})`).start()
    const errors: Error[] = [];

    await workQueue.addAll(taskFns.map(taskFn => async () => {
        const result = await taskFn();
        if (result instanceof Error) {
            errors.push(result);
        }
        await setTimeout(throttleMs);
        done++;
        spinner.update({ text: `${title} (${done}/${taskFns.length})`});
    }))

    if (errors.length > 0) {
        spinner.warn({ text: `${title} finished with errors` });
    }
    else {
        spinner.success();
    }

    if (errors.length > 0) {
        return errors;
    }
}
