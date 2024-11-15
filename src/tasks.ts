import { createSpinner } from 'nanospinner';
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
}

export async function wrapParallelTasks(
    taskFns: (() => Promise<void>)[],
    { title, concurrency }: ParallelTaskOptions): Promise<Error[] | void> {

    let done = 0;
    const workQueue = new PQueue({ concurrency });
    const spinner = createSpinner(`${title} (${done}/${taskFns.length})`).start()
    const errors: Error[] = [];

    await workQueue.addAll(taskFns.map(taskFn => async () => {
        try {
           await taskFn();
        }
        catch (err) {
            if (err instanceof Error) {
                errors.push(err);
            }
            else {
                throw err;
            }
        }
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
