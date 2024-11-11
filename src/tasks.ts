import { createSpinner } from 'nanospinner';

type RegisterTaskOptions = {
   title: string
}

export function wrapTask<Params, ReturnType> (
    taskFn: (args: Params) => Promise<ReturnType>,
    { title }: RegisterTaskOptions
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
